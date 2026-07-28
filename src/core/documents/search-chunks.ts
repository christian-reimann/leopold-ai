import {cosineDistance, desc, eq, isNotNull, sql} from 'drizzle-orm';
import {db} from '@/db/client';
import {documentChunks} from '@/db/schema/document-chunks';
import {documents} from '@/db/schema/documents';
import {embedText} from '@/llm/embeddings';

export interface ChunkSearchResult {
  chunkId: string;
  documentId: string;
  documentType: string;
  content: string;
  similarity: number;
}

/**
 * Ähnlichkeitssuche über die Dokument-Chunks (Retrieval-Grundlage für Matching
 * und Bewerbungs-Generierung, §6 im Projektplan). `1 - cosineDistance` macht
 * aus der Distanz eine Ähnlichkeit in [0, 1] (1 = identisch), leichter lesbar
 * als eine rohe Distanz.
 */
export async function searchDocumentChunks(query: string, limit = 5): Promise<ChunkSearchResult[]> {
  const queryEmbedding = await embedText(query);
  // Klammer um die Distanz ist nötig: der `<=>`-Operator von pgvector bindet
  // schwächer als `-`, ohne Klammer würde Postgres `1 - embedding` zuerst
  // auswerten (Typfehler: integer - vector).
  const similarity = sql<number>`1 - (${cosineDistance(documentChunks.embedding, queryEmbedding)})`;

  return await db
      .select({
          chunkId: documentChunks.id,
          documentId: documentChunks.documentId,
          documentType: documents.type,
          content: documentChunks.content,
          similarity,
      })
      .from(documentChunks)
      .innerJoin(documents, eq(documents.id, documentChunks.documentId))
      .where(isNotNull(documentChunks.embedding))
      .orderBy(desc(similarity))
      .limit(limit);
}
