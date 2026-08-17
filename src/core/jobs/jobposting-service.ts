import { createHash } from 'node:crypto';
import { and, cosineDistance, desc, eq, inArray, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { jobPostings } from '@/db/schema/job-postings';
import { embeddingClient } from '@/llm/embeddings';
import type { ConnectorResult } from '@/shared/schemas/connector-result';
import type { JobPosting } from '@/shared/schemas/job-posting';

/**
 * Threshold for dedup level 2 (cross-source near-duplicate via embedding cosine similarity).
 * A heuristic, not an exact value – raise it if there are too many false positives (different
 * postings get incorrectly linked), lower it if too many duplicates are missed.
 */
const DUPLICATE_SIMILARITY_THRESHOLD = 0.95;

export class JobPostingService {
  async listRecentCanonical(limit = 20): Promise<(typeof jobPostings.$inferSelect)[]> {
    return db
      .select()
      .from(jobPostings)
      .where(isNull(jobPostings.duplicateOfId))
      .orderBy(sql`${jobPostings.data}->>'postedAt' DESC NULLS LAST`, desc(jobPostings.id))
      .limit(limit);
  }

  async getById(jobId: string): Promise<typeof jobPostings.$inferSelect> {
    const [posting] = await db.select().from(jobPostings).where(eq(jobPostings.id, jobId));
    if (!posting) {
      throw new Error(`Job posting not found: ${jobId}`);
    }
    return posting;
  }

  // Lets connectors skip the (expensive) per-item detail fetch for postings that already
  // exist for this connector – see JobConnector.search's sourceIdLookup parameter.
  async findKnownSourceIds(connectorId: string, candidateSourceIds: string[]): Promise<Set<string>> {
    if (candidateSourceIds.length === 0) {
      return new Set();
    }
    const rows = await db
      .select({ sourceId: jobPostings.sourceId })
      .from(jobPostings)
      .where(and(eq(jobPostings.sourceConnector, connectorId), inArray(jobPostings.sourceId, candidateSourceIds)));
    return new Set(rows.map((row) => row.sourceId));
  }

  async ingestConnectorResults(connectorId: string, results: ConnectorResult[]): Promise<string[]> {
    const newCanonicalIds: string[] = [];
    for (const result of results) {
      const id = await this.ingestOne(connectorId, result);
      if (id) {
        newCanonicalIds.push(id);
      }
    }
    return newCanonicalIds;
  }

  private async ingestOne(connectorId: string, result: ConnectorResult): Promise<string | null> {
    const { sourceId, posting, rawHtml } = result;
    const dedupeHash = this.computeDedupeHash(posting);

    const [existing] = await db
      .select({ id: jobPostings.id })
      .from(jobPostings)
      .where(and(eq(jobPostings.sourceConnector, connectorId), eq(jobPostings.sourceId, sourceId)));

    if (existing) {
      // Re-poll of the same source (dedup level 1): update content. duplicateOfId stays
      // untouched – it was determined once via dedup level 2 when first created.
      await db
        .update(jobPostings)
        .set({ dedupeHash, rawHtml, data: posting, updatedAt: new Date() })
        .where(eq(jobPostings.id, existing.id));
      return null;
    }

    const embedding = await embeddingClient.embedText(this.embeddingInput(posting));
    const duplicateOfId = await this.findNearDuplicate(connectorId, embedding);

    const [inserted] = await db
      .insert(jobPostings)
      .values({
        sourceConnector: connectorId,
        sourceId,
        dedupeHash,
        duplicateOfId,
        rawHtml,
        data: posting,
        embedding,
      })
      .returning({ id: jobPostings.id });

    return duplicateOfId ? null : (inserted?.id ?? null);
  }

  /**
   * Dedup level 2: cross-source near-duplicate. Only compare against other sources (`ne`) and
   * only against already-canonical rows (`duplicateOfId IS NULL`) – otherwise chains could form
   * that point to a duplicate instead of the canonical posting.
   */
  private async findNearDuplicate(connectorId: string, embedding: number[]): Promise<string | null> {
    const similarity = sql<number>`1 - (${cosineDistance(jobPostings.embedding, embedding)})`;

    const [match] = await db
      .select({ id: jobPostings.id, similarity })
      .from(jobPostings)
      .where(
        and(
          ne(jobPostings.sourceConnector, connectorId),
          isNull(jobPostings.duplicateOfId),
          isNotNull(jobPostings.embedding),
        ),
      )
      .orderBy(desc(similarity))
      .limit(1);

    return match && match.similarity >= DUPLICATE_SIMILARITY_THRESHOLD ? match.id : null;
  }

  private embeddingInput(posting: JobPosting): string {
    return [posting.title, posting.company, posting.location ?? '', posting.description].join('\n');
  }

  /**
   * Cheap content hash over the identity-defining fields – serves only as a candidate signal
   * (no longer a unique constraint, see the `job_postings` schema). The actual cross-source dedup
   * runs via embedding similarity (dedup level 2, see `findNearDuplicate`).
   */
  private computeDedupeHash(posting: JobPosting): string {
    const basis = [
      this.normalizeForDedupe(posting.title),
      this.normalizeForDedupe(posting.company),
      this.normalizeForDedupe(posting.location ?? ''),
    ].join('|');
    return createHash('sha256').update(basis).digest('hex');
  }

  private normalizeForDedupe(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }
}

export const jobPostingService = new JobPostingService();
