import { createHash } from 'node:crypto';
import { and, cosineDistance, desc, eq, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { jobPostings } from '@/db/schema/job-postings';
import { embeddingClient } from '@/llm/embeddings';
import type { ConnectorResult } from '@/shared/schemas/connector-result';
import type { JobPosting } from '@/shared/schemas/job-posting';

/**
 * Schwellwert für Dedup-Ebene 2 (Cross-Source-Near-Duplicate via Embedding-Cosine-Similarity).
 * Heuristik, kein exakter Wert – bei zu vielen False Positives (unterschiedliche Stellen werden
 * fälschlich verlinkt) erhöhen, bei zu vielen übersehenen Duplikaten senken.
 */
const DUPLICATE_SIMILARITY_THRESHOLD = 0.95;

export class JobPostingService {
  async ingestConnectorResults(connectorId: string, results: ConnectorResult[]): Promise<void> {
    for (const result of results) {
      await this.ingestOne(connectorId, result);
    }
  }

  private async ingestOne(connectorId: string, result: ConnectorResult): Promise<void> {
    const { sourceId, posting, rawHtml } = result;
    const dedupeHash = this.computeDedupeHash(posting);

    const [existing] = await db
      .select({ id: jobPostings.id })
      .from(jobPostings)
      .where(and(eq(jobPostings.sourceConnector, connectorId), eq(jobPostings.sourceId, sourceId)));

    if (existing) {
      // Re-Poll derselben Quelle (Dedup-Ebene 1): Inhalte aktualisieren. duplicateOfId bleibt
      // unangetastet – wurde beim Erstanlegen einmalig über Dedup-Ebene 2 bestimmt.
      await db
        .update(jobPostings)
        .set({ dedupeHash, rawHtml, data: posting, updatedAt: new Date() })
        .where(eq(jobPostings.id, existing.id));
      return;
    }

    const embedding = await embeddingClient.embedText(this.embeddingInput(posting));
    const duplicateOfId = await this.findNearDuplicate(connectorId, embedding);

    await db.insert(jobPostings).values({
      sourceConnector: connectorId,
      sourceId,
      dedupeHash,
      duplicateOfId,
      rawHtml,
      data: posting,
      embedding,
    });
  }

  /**
   * Dedup-Ebene 2: quellenübergreifendes Near-Duplicate. Nur gegen andere Quellen (`ne`) und nur
   * gegen bereits kanonische Zeilen (`duplicateOfId IS NULL`) vergleichen – sonst könnten sich
   * Ketten bilden, die auf ein Duplikat statt auf die kanonische Stelle verweisen.
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
   * Billiger Content-Hash über die identitätsstiftenden Felder – dient nur als Kandidaten-Signal
   * (kein Unique-Constraint mehr, siehe `job_postings`-Schema). Die eigentliche Cross-Source-Dedup
   * läuft über Embedding-Ähnlichkeit (Dedup-Ebene 2, siehe `findNearDuplicate`).
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
