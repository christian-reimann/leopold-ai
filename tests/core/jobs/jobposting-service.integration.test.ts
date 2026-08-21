import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jobPostingService } from '@/core/jobs/jobposting-service';
import { profileService } from '@/core/profile/profile-service';
import { db } from '@/db/client';
import { applications } from '@/db/schema/applications';
import { jobPostings } from '@/db/schema/job-postings';
import { embeddingClient } from '@/llm/embeddings';
import type { ConnectorResult } from '@/shared/schemas/connector-result';
import { buildJobPosting } from '../../fixtures/shared';
import { truncateAll } from '../../fixtures/db/test-db';

function result(sourceId: string, overrides: Parameters<typeof buildJobPosting>[0] = {}): ConnectorResult {
  return { sourceId, posting: buildJobPosting(overrides), rawHtml: '<html></html>' };
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function insertPosting(
  opts: { postedAt?: Date; createdAt?: Date; duplicateOfId?: string } = {},
): Promise<string> {
  const [row] = await db
    .insert(jobPostings)
    .values({
      sourceConnector: 'adzuna',
      sourceId: randomUUID(),
      dedupeHash: randomUUID(),
      duplicateOfId: opts.duplicateOfId ?? null,
      data: buildJobPosting(opts.postedAt ? { postedAt: opts.postedAt.toISOString() } : {}),
      ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
    })
    .returning({ id: jobPostings.id });
  return row!.id;
}

async function insertApplication(jobId: string): Promise<void> {
  const profileId = await profileService.createProfile('Test Profil');
  await db.insert(applications).values({ profileId, jobId });
}

async function exists(jobId: string): Promise<boolean> {
  const [row] = await db.select({ id: jobPostings.id }).from(jobPostings).where(eq(jobPostings.id, jobId));
  return row !== undefined;
}

describe('JobPostingService (integration)', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await truncateAll();
  });

  it('ingestConnectorResults inserts a new canonical posting', async () => {
    vi.spyOn(embeddingClient, 'embedText').mockResolvedValue(Array(1024).fill(0.1));

    const newIds = await jobPostingService.ingestConnectorResults('adzuna', [result('job-1')]);

    expect(newIds).toHaveLength(1);
    const posting = await jobPostingService.getById(newIds[0]!);
    expect(posting.sourceConnector).toBe('adzuna');
    expect(posting.duplicateOfId).toBeNull();
  });

  it('dedup level 1: re-polling the same source updates instead of duplicating', async () => {
    vi.spyOn(embeddingClient, 'embedText').mockResolvedValue(Array(1024).fill(0.1));

    const [firstId] = await jobPostingService.ingestConnectorResults('adzuna', [
      result('job-1', { title: 'Java Developer' }),
    ]);
    const second = await jobPostingService.ingestConnectorResults('adzuna', [
      result('job-1', { title: 'Senior Java Developer' }),
    ]);

    expect(second).toHaveLength(0);
    const rows = await db.select().from(jobPostings).where(eq(jobPostings.sourceConnector, 'adzuna'));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(firstId);
    expect(rows[0]?.data.title).toBe('Senior Java Developer');
  });

  it('dedup level 2: a near-identical posting from another source is linked via duplicateOfId', async () => {
    const embedding = Array(1024).fill(0.1);
    vi.spyOn(embeddingClient, 'embedText').mockResolvedValue(embedding);

    const [canonicalId] = await jobPostingService.ingestConnectorResults('adzuna', [result('job-1')]);
    const duplicateNewIds = await jobPostingService.ingestConnectorResults('arbeitnow', [result('job-1')]);

    // Duplicate is linked, not returned as a new canonical posting.
    expect(duplicateNewIds).toHaveLength(0);
    const [duplicateRow] = await db.select().from(jobPostings).where(eq(jobPostings.sourceConnector, 'arbeitnow'));
    expect(duplicateRow?.duplicateOfId).toBe(canonicalId);
  });

  it('findKnownSourceIds returns only the source ids that already exist for that connector', async () => {
    vi.spyOn(embeddingClient, 'embedText').mockResolvedValue(Array(1024).fill(0.1));
    await jobPostingService.ingestConnectorResults('adzuna', [result('job-1')]);

    const known = await jobPostingService.findKnownSourceIds('adzuna', ['job-1', 'job-2']);

    expect(known).toEqual(new Set(['job-1']));
  });

  it('listRecentCanonical excludes duplicates', async () => {
    const embedding = Array(1024).fill(0.1);
    vi.spyOn(embeddingClient, 'embedText').mockResolvedValue(embedding);
    await jobPostingService.ingestConnectorResults('adzuna', [result('job-1')]);
    await jobPostingService.ingestConnectorResults('arbeitnow', [result('job-1')]); // near-duplicate

    const canonical = await jobPostingService.listRecentCanonical();

    expect(canonical).toHaveLength(1);
    expect(canonical[0]?.sourceConnector).toBe('adzuna');
  });

  describe('deleteStalePostings', () => {
    it('deletes a stale posting (via postedAt) without an application', async () => {
      const id = await insertPosting({ postedAt: daysAgo(60) });

      const deleted = await jobPostingService.deleteStalePostings();

      expect(deleted).toBe(1);
      expect(await exists(id)).toBe(false);
    });

    it('keeps a stale posting that has an application, regardless of status', async () => {
      const id = await insertPosting({ postedAt: daysAgo(60) });
      await insertApplication(id);

      const deleted = await jobPostingService.deleteStalePostings();

      expect(deleted).toBe(0);
      expect(await exists(id)).toBe(true);
    });

    it('falls back to createdAt when postedAt is absent', async () => {
      const id = await insertPosting({ createdAt: daysAgo(60) });

      const deleted = await jobPostingService.deleteStalePostings();

      expect(deleted).toBe(1);
      expect(await exists(id)).toBe(false);
    });

    it('keeps a posting that is not stale yet', async () => {
      const id = await insertPosting({ postedAt: daysAgo(10) });

      const deleted = await jobPostingService.deleteStalePostings();

      expect(deleted).toBe(0);
      expect(await exists(id)).toBe(true);
    });

    it('deletes a stale canonical posting together with its stale, unapplied duplicate', async () => {
      const canonicalId = await insertPosting({ postedAt: daysAgo(60) });
      const duplicateId = await insertPosting({ postedAt: daysAgo(60), duplicateOfId: canonicalId });

      const deleted = await jobPostingService.deleteStalePostings();

      expect(deleted).toBe(2);
      expect(await exists(canonicalId)).toBe(false);
      expect(await exists(duplicateId)).toBe(false);
    });

    it('keeps a stale canonical posting whose duplicate is not stale itself', async () => {
      const canonicalId = await insertPosting({ postedAt: daysAgo(60) });
      const duplicateId = await insertPosting({ postedAt: daysAgo(10), duplicateOfId: canonicalId });

      const deleted = await jobPostingService.deleteStalePostings();

      expect(deleted).toBe(0);
      expect(await exists(canonicalId)).toBe(true);
      expect(await exists(duplicateId)).toBe(true);
    });
  });
});
