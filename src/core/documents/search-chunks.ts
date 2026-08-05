import { and, cosineDistance, desc, inArray, isNotNull, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { documentChunks } from '@/db/schema/document-chunks';
import { embeddingClient } from '@/llm/embeddings';

const DEFAULT_LIMIT = 8;

export type ChunkSearchResult = {
  documentId: string;
  chunkIndex: number;
  content: string;
  similarity: number;
};

export class ChunkSearchService {
  async search(queryText: string, options?: { limit?: number; documentIds?: string[] }): Promise<ChunkSearchResult[]> {
    const embedding = await embeddingClient.embedText(queryText);
    const similarity = sql<number>`1 - (${cosineDistance(documentChunks.embedding, embedding)})`;

    const conditions = [isNotNull(documentChunks.embedding)];
    if (options?.documentIds && options.documentIds.length > 0) {
      conditions.push(inArray(documentChunks.documentId, options.documentIds));
    }

    return db
      .select({
        documentId: documentChunks.documentId,
        chunkIndex: documentChunks.chunkIndex,
        content: documentChunks.content,
        similarity,
      })
      .from(documentChunks)
      .where(and(...conditions))
      .orderBy(desc(similarity))
      .limit(options?.limit ?? DEFAULT_LIMIT);
  }
}

export const chunkSearchService = new ChunkSearchService();
