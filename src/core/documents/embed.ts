import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { documentChunks } from '@/db/schema/document-chunks';
import { documents } from '@/db/schema/documents';
import { embedTexts } from '@/llm/embeddings';
import { chunkText } from './chunk';

export async function embedDocumentById(documentId: string): Promise<void> {
  const [document] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!document) {
    throw new Error(`Dokument nicht gefunden: ${documentId}`);
  }

  await db
    .update(documents)
    .set({ embeddingStatus: 'processing', embeddingError: null, updatedAt: new Date() })
    .where(eq(documents.id, documentId));

  try {
    if (!document.extractedText) {
      throw new Error('Dokument wurde noch nicht geparst');
    }

    const chunks = chunkText(document.extractedText);
    const embeddings = chunks.length > 0 ? await embedTexts(chunks) : [];

    // Idempotent: bestehende Chunks (z.B. aus einem vorherigen Lauf) ersetzen.
    await db.transaction(async (tx) => {
      await tx.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
      if (chunks.length > 0) {
        await tx.insert(documentChunks).values(
          chunks.map((content, chunkIndex) => ({
            documentId,
            chunkIndex,
            content,
            embedding: embeddings[chunkIndex],
          })),
        );
      }
    });

    await db
      .update(documents)
      .set({ embeddingStatus: 'done', updatedAt: new Date() })
      .where(eq(documents.id, documentId));
  } catch (error) {
    await db
      .update(documents)
      .set({
        embeddingStatus: 'failed',
        embeddingError: error instanceof Error ? error.message : 'Unbekannter Fehler beim Embedding',
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
    throw error;
  }
}
