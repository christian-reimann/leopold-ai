import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { matchingService } from '@/core/matching/matching-service';
import { profileService } from '@/core/profile/profile-service';
import { db } from '@/db/client';
import { jobPostings } from '@/db/schema/job-postings';
import { matches } from '@/db/schema/matches';
import { embeddingClient } from '@/llm/embeddings';
import { matchJudge } from '@/llm/match-judge';
import { buildJobPosting, buildProfile } from '../../fixtures/shared';
import { truncateAll } from '../../fixtures/db/test-db';

async function insertJobPosting(overrides: Parameters<typeof buildJobPosting>[0] = {}, embedding: number[] | null = null) {
  const [row] = await db
    .insert(jobPostings)
    .values({
      sourceConnector: 'adzuna',
      sourceId: randomUUID(),
      dedupeHash: randomUUID(),
      data: buildJobPosting(overrides),
      embedding,
    })
    .returning({ id: jobPostings.id });
  return row!.id;
}

describe('MatchingService.matchJob (integration)', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await truncateAll();
  });

  it('judges via the (mocked) LLM and upserts a match row', async () => {
    vi.spyOn(embeddingClient, 'embedText').mockResolvedValue(Array(1024).fill(0.1));
    vi.spyOn(matchJudge, 'judge').mockResolvedValue({
      scoreMeToJob: 88,
      positives: [{ text: 'Guter Fit', weight: 3 }],
      negatives: [],
    });

    const profileId = await profileService.createProfile('Mein Profil');
    await profileService.completeExtraction(profileId, buildProfile());
    const jobId = await insertJobPosting({}, Array(1024).fill(0.1));

    await matchingService.matchJob(jobId, profileId);

    const [match] = await db.select().from(matches).where(eq(matches.jobId, jobId));
    expect(match).toMatchObject({ profileId, jobId, scoreMeToJob: 88 });
    expect(match?.similarity).toBeCloseTo(1);
  });

  it('re-running matchJob updates the existing match row instead of duplicating it', async () => {
    vi.spyOn(embeddingClient, 'embedText').mockResolvedValue(Array(1024).fill(0.1));
    const judgeSpy = vi
      .spyOn(matchJudge, 'judge')
      .mockResolvedValueOnce({ scoreMeToJob: 40, positives: [], negatives: [] })
      .mockResolvedValueOnce({ scoreMeToJob: 70, positives: [], negatives: [] });

    const profileId = await profileService.createProfile('Mein Profil');
    await profileService.completeExtraction(profileId, buildProfile());
    const jobId = await insertJobPosting({}, Array(1024).fill(0.1));

    await matchingService.matchJob(jobId, profileId);
    await matchingService.matchJob(jobId, profileId);

    expect(judgeSpy).toHaveBeenCalledTimes(2);
    const rows = await db.select().from(matches).where(eq(matches.jobId, jobId));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.scoreMeToJob).toBe(70);
  });

  it('skips the LLM call and does not create a match when the profile has no embedding', async () => {
    const judgeSpy = vi.spyOn(matchJudge, 'judge');
    const profileId = await profileService.createProfile('Mein Profil');
    const jobId = await insertJobPosting({}, Array(1024).fill(0.1));

    await matchingService.matchJob(jobId, profileId);

    expect(judgeSpy).not.toHaveBeenCalled();
    expect(await db.select().from(matches).where(eq(matches.jobId, jobId))).toHaveLength(0);
  });
});

describe('MatchingService.listRecent / countByProfile (integration)', () => {
  afterEach(async () => {
    await truncateAll();
  });

  async function seedMatch(profileId: string, postedAt: string, score: number) {
    const jobId = await insertJobPosting({ postedAt });
    await db.insert(matches).values({ profileId, jobId, scoreMeToJob: score, reasoning: { positives: [], negatives: [] } });
  }

  it('sorts by postedAt (JSON path sort) descending by default', async () => {
    const profileId = await profileService.createProfile('Mein Profil');
    await seedMatch(profileId, '2026-01-01T00:00:00.000Z', 50);
    await seedMatch(profileId, '2026-03-01T00:00:00.000Z', 10);
    await seedMatch(profileId, '2026-02-01T00:00:00.000Z', 90);

    const recent = await matchingService.listRecent(profileId);

    expect(recent.map((r) => r.data.postedAt)).toEqual([
      '2026-03-01T00:00:00.000Z',
      '2026-02-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    ]);
  });

  it('sorts by score descending when sortBy is "score"', async () => {
    const profileId = await profileService.createProfile('Mein Profil');
    await seedMatch(profileId, '2026-01-01T00:00:00.000Z', 50);
    await seedMatch(profileId, '2026-01-02T00:00:00.000Z', 90);
    await seedMatch(profileId, '2026-01-03T00:00:00.000Z', 10);

    const recent = await matchingService.listRecent(profileId, 50, 'score');

    expect(recent.map((r) => r.score)).toEqual([90, 50, 10]);
  });

  it('maxAgeDays filters out matches for postings older than the cutoff', async () => {
    const profileId = await profileService.createProfile('Mein Profil');
    const now = new Date();
    const recentDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const oldDate = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString();
    await seedMatch(profileId, recentDate, 50);
    await seedMatch(profileId, oldDate, 90);

    const recent = await matchingService.listRecent(profileId, 50, 'postedAt', 0, 30);

    expect(recent).toHaveLength(1);
    expect(recent[0]?.score).toBe(50);
    expect(await matchingService.countByProfile(profileId, 30)).toBe(1);
  });

  it('countByProfile counts all matches without a maxAgeDays filter', async () => {
    const profileId = await profileService.createProfile('Mein Profil');
    await seedMatch(profileId, '2026-01-01T00:00:00.000Z', 50);
    await seedMatch(profileId, '2020-01-01T00:00:00.000Z', 10);

    expect(await matchingService.countByProfile(profileId)).toBe(2);
  });
});
