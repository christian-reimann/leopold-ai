import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cosineDistance, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { documentQueue } from '@/core/queue/document-queue';
import { db } from '@/db/client';
import { documentChunks } from '@/db/schema/document-chunks';
import { documents } from '@/db/schema/documents';
import { profiles } from '@/db/schema/profiles';
import { embeddingClient } from '@/llm/embeddings';
import { profileExtractor } from '@/llm/profile-extraction';
import { parserRegistry } from './parsers/registered-parsers';

export interface ChunkSearchResult {
  chunkId: string;
  documentId: string;
  documentType: string;
  content: string;
  similarity: number;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  cv: 'Lebenslauf',
  cover_letter: 'Anschreiben',
  certificate: 'Zertifikat',
};

/**
 * Chunking-Strategie: Bewerbungsunterlagen sind kurz und
 * bereits strukturiert (Absätze, Abschnitte), daher genügt ein einfaches
 * absatzbasiertes Packen bis zu einer Zielgröße.
 */
const TARGET_CHUNK_CHARS = 1500;

export class DocumentService {
  isSupportedDocumentExtension(extension: string): boolean {
    return parserRegistry.isSupported(extension);
  }

  async parseDocumentById(documentId: string): Promise<void> {
    const [document] = await db.select().from(documents).where(eq(documents.id, documentId));
    if (!document) {
      throw new Error(`Dokument nicht gefunden: ${documentId}`);
    }

    await db
      .update(documents)
      .set({ status: 'processing', error: null, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    try {
      const extension = path.extname(document.storagePath).toLowerCase();
      if (!parserRegistry.isSupported(extension)) {
        throw new Error(`Nicht unterstütztes Dateiformat: ${extension}`);
      }

      const buffer = await readFile(path.resolve(document.storagePath));
      const extractedText = await parserRegistry.parse(buffer, extension);

      await db
        .update(documents)
        .set({ status: 'done', extractedText, updatedAt: new Date() })
        .where(eq(documents.id, documentId));

      await documentQueue.enqueueEmbedDocument(documentId);
    } catch (error) {
      await db
        .update(documents)
        .set({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unbekannter Fehler beim Parsen',
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));
      throw error;
    }
  }

  async embedDocumentById(documentId: string): Promise<void> {
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

      const chunks = this.chunkText(document.extractedText);
      const embeddings = chunks.length > 0 ? await embeddingClient.embedTexts(chunks) : [];

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

  async extractProfileFromDocuments(documentIds: string[]): Promise<void> {
    const [existing] = await db.select({ id: profiles.id }).from(profiles).limit(1);
    let profileId: string;
    if (existing) {
      profileId = existing.id;
      await db
        .update(profiles)
        .set({ status: 'processing', error: null, updatedAt: new Date() })
        .where(eq(profiles.id, profileId));
    } else {
      const [created] = await db
        .insert(profiles)
        .values({ source: 'extracted', status: 'processing' })
        .returning({ id: profiles.id });
      if (!created) {
        throw new Error('Profil konnte nicht angelegt werden');
      }
      profileId = created.id;
    }

    try {
      const docs = await db.select().from(documents).where(inArray(documents.id, documentIds));

      const missingIds = documentIds.filter((id) => !docs.some((doc) => doc.id === id));
      if (missingIds.length > 0) {
        throw new Error(`Dokument(e) nicht gefunden: ${missingIds.join(', ')}`);
      }
      const unparsed = docs.filter((doc) => !doc.extractedText);
      if (unparsed.length > 0) {
        throw new Error(`Dokument(e) wurden noch nicht geparst: ${unparsed.map((doc) => doc.id).join(', ')}`);
      }

      const combinedText = docs
        .map((doc) => `--- ${DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type} ---\n${doc.extractedText}`)
        .join('\n\n');

      const profileData = await profileExtractor.extractProfile(combinedText);

      await db
        .update(profiles)
        .set({ data: profileData, source: 'extracted', status: 'done', error: null, updatedAt: new Date() })
        .where(eq(profiles.id, profileId));
    } catch (error) {
      await db
        .update(profiles)
        .set({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unbekannter Fehler bei der Profil-Extraktion',
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, profileId));
      throw error;
    }
  }

  async searchDocumentChunks(query: string, limit = 5): Promise<ChunkSearchResult[]> {
    const queryEmbedding = await embeddingClient.embedText(query);
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

  private chunkText(text: string): string[] {
    const paragraphs = text
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0);

    const chunks: string[] = [];
    let current = '';

    for (const paragraph of paragraphs) {
      const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

      if (candidate.length > TARGET_CHUNK_CHARS && current) {
        chunks.push(current);
        current = paragraph;
      } else {
        current = candidate;
      }
    }

    if (current) {
      chunks.push(current);
    }

    return chunks;
  }
}

export const documentService = new DocumentService();
