import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jobPostingService } from '@/core/jobs/jobposting-service';
import { matchingService } from '@/core/matching/matching-service';
import { profileService } from '@/core/profile/profile-service';
import { db } from '@/db/client';
import { matchJudge } from '@/llm/match-judge';
import { buildJobPosting, buildProfile } from '../../fixtures/shared';

// cosineSimilarity is a private but pure method with no I/O - accessed via cast instead
// of changing visibility in production code (see plan: "no invasive production code changes").
const cosineSimilarity = (matchingService as unknown as { cosineSimilarity: (a: number[], b: number[]) => number })
  .cosineSimilarity.bind(matchingService);

describe('MatchingService.cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [-1, -2, -3])).toBeCloseTo(-1);
  });

  it('is symmetric', () => {
    const a = [0.1, 0.4, 0.9, -0.2];
    const b = [0.3, -0.1, 0.5, 0.8];
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a));
  });
});

vi.mock('@/db/client', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  },
}));
vi.mock('@/core/jobs/jobposting-service', () => ({ jobPostingService: { getById: vi.fn() } }));
vi.mock('@/core/profile/profile-service', () => ({ profileService: { getProfile: vi.fn() } }));
vi.mock('@/llm/match-judge', () => ({ matchJudge: { judge: vi.fn() } }));

describe('MatchingService.matchJob', () => {
  const jobId = 'job-1';
  const profileId = 'profile-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips (no throw, no LLM call) when the profile has no embedding yet', async () => {
    vi.mocked(jobPostingService.getById).mockResolvedValue({ embedding: [1, 0] } as never);
    vi.mocked(profileService.getProfile).mockResolvedValue({ data: buildProfile(), embedding: null } as never);

    await matchingService.matchJob(jobId, profileId);

    expect(matchJudge.judge).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('skips when the job has no embedding yet', async () => {
    vi.mocked(jobPostingService.getById).mockResolvedValue({ embedding: null } as never);
    vi.mocked(profileService.getProfile).mockResolvedValue({ data: buildProfile(), embedding: [1, 0] } as never);

    await matchingService.matchJob(jobId, profileId);

    expect(matchJudge.judge).not.toHaveBeenCalled();
  });

  it('skips the LLM call when the embedding pre-filter similarity is below the threshold', async () => {
    // orthogonal vectors -> cosine similarity 0, below MATCH_PREFILTER_SIMILARITY_THRESHOLD (0.3)
    vi.mocked(jobPostingService.getById).mockResolvedValue({
      embedding: [1, 0],
      data: buildJobPosting(),
    } as never);
    vi.mocked(profileService.getProfile).mockResolvedValue({
      data: buildProfile(),
      embedding: [0, 1],
    } as never);

    await matchingService.matchJob(jobId, profileId);

    expect(matchJudge.judge).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('judges and upserts the match when the pre-filter passes', async () => {
    const jobPosting = buildJobPosting();
    const profile = buildProfile();
    vi.mocked(jobPostingService.getById).mockResolvedValue({ embedding: [1, 1], data: jobPosting } as never);
    vi.mocked(profileService.getProfile).mockResolvedValue({ embedding: [1, 1], data: profile } as never);
    vi.mocked(matchJudge.judge).mockResolvedValue({
      scoreMeToJob: 90,
      positives: [{ text: 'Guter Fit', weight: 3 }],
      negatives: [],
    });

    await matchingService.matchJob(jobId, profileId);

    expect(matchJudge.judge).toHaveBeenCalledWith(profile, jobPosting);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });
});
