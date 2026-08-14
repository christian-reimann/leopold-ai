import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { profileService } from '@/core/profile/profile-service';
import { documentQueue } from '@/core/queue/document-queue';
import { db } from '@/db/client';
import { documentChunks } from '@/db/schema/document-chunks';
import { documents } from '@/db/schema/documents';
import { embeddingClient } from '@/llm/embeddings';
import { profileExtractor } from '@/llm/profile-extraction';
import type { DocumentType } from '@/shared/schemas/document';
import { parserRegistry } from './parsers/registered-parsers';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  cv: 'Lebenslauf',
  cover_letter: 'Anschreiben',
  certificate: 'Zertifikat',
};

/**
 * Chunking strategy: application documents are short and
 * already structured (paragraphs, sections), so simple
 * paragraph-based packing up to a target size is sufficient.
 */
const TARGET_CHUNK_CHARS = 1500;

export class DocumentService {
  isSupportedDocumentExtension(extension: string): boolean {
    return parserRegistry.isSupported(extension);
  }

  async createDocument(input: {
    profileId: string;
    type: DocumentType;
    storagePath: string;
    originalFilename: string;
  }): Promise<string> {
    const [document] = await db.insert(documents).values(input).returning({ id: documents.id });
    if (!document) {
      throw new Error('Document could not be created');
    }

    await documentQueue.enqueueParseDocument(document.id);
    return document.id;
  }

  /** Like {@link createDocument}, but waits for the parse job to actually finish. */
  async createDocumentAndWait(input: {
    profileId: string;
    type: DocumentType;
    storagePath: string;
    originalFilename: string;
  }): Promise<string> {
    const [document] = await db.insert(documents).values(input).returning({ id: documents.id });
    if (!document) {
      throw new Error('Document could not be created');
    }

    await documentQueue.enqueueParseDocumentAndWait(document.id);
    return document.id;
  }

  async requestProfileExtraction(documentIds: string[], profileId: string): Promise<void> {
    await documentQueue.enqueueExtractProfile(documentIds, profileId);
  }

  /** Like {@link requestProfileExtraction}, but waits for the extraction to actually finish. */
  async requestProfileExtractionAndWait(documentIds: string[], profileId: string): Promise<void> {
    await documentQueue.enqueueExtractProfileAndWait(documentIds, profileId);
  }

  async listAll(profileId: string): Promise<(typeof documents.$inferSelect)[]> {
    return db.select().from(documents).where(eq(documents.profileId, profileId)).orderBy(desc(documents.createdAt));
  }

  async updateDocumentType(documentId: string, type: DocumentType): Promise<void> {
    await db.update(documents).set({ type, updatedAt: new Date() }).where(eq(documents.id, documentId));
  }

  /** Deletes the DB row and returns the `storagePath` so the caller can remove the file. */
  async deleteDocument(documentId: string): Promise<string | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, documentId));
    if (!document) {
      return undefined;
    }

    await db.delete(documents).where(eq(documents.id, documentId));
    return document.storagePath;
  }

  async parseDocumentById(documentId: string): Promise<void> {
    const [document] = await db.select().from(documents).where(eq(documents.id, documentId));
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    await db
      .update(documents)
      .set({ status: 'processing', error: null, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    try {
      const extension = path.extname(document.storagePath).toLowerCase();
      if (!parserRegistry.isSupported(extension)) {
        throw new Error(`Unsupported file format: ${extension}`);
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
      throw new Error(`Document not found: ${documentId}`);
    }

    await db
      .update(documents)
      .set({ embeddingStatus: 'processing', embeddingError: null, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    try {
      if (!document.extractedText) {
        throw new Error('Document has not been parsed yet');
      }

      const chunks = this.chunkText(document.extractedText);
      const embeddings = chunks.length > 0 ? await embeddingClient.embedTexts(chunks) : [];

      // Idempotent: replaces existing chunks (e.g. from a previous run).
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

  async extractProfileFromDocuments(documentIds: string[], profileId: string): Promise<void> {
    await profileService.beginExtraction(profileId);

    try {
      const docs = await db
        .select()
        .from(documents)
        .where(and(inArray(documents.id, documentIds), eq(documents.profileId, profileId)));

      const missingIds = documentIds.filter((id) => !docs.some((doc) => doc.id === id));
      if (missingIds.length > 0) {
        throw new Error(`Document(s) not found: ${missingIds.join(', ')}`);
      }
      const unparsed = docs.filter((doc) => !doc.extractedText);
      if (unparsed.length > 0) {
        throw new Error(`Document(s) have not been parsed yet: ${unparsed.map((doc) => doc.id).join(', ')}`);
      }

      const combinedText = docs
        .map((doc) => `--- ${DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type} ---\n${doc.extractedText}`)
        .join('\n\n');

      const profileData = await profileExtractor.extractProfile(combinedText);

      await profileService.completeExtraction(profileId, profileData);
    } catch (error) {
      await profileService.failExtraction(
        profileId,
        error instanceof Error ? error.message : 'Unbekannter Fehler bei der Profil-Extraktion',
      );
      throw error;
    }
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
