import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import mammoth from 'mammoth';
import { extractText, getDocumentProxy, renderPageAsImage } from 'unpdf';
import { enqueueEmbedDocument } from '@/core/queue/document-queue';
import { db } from '@/db/client';
import { documents } from '@/db/schema/documents';
import { transcribeImage, type ImageMediaType } from '@/llm/vision-extraction';

export const SUPPORTED_DOCUMENT_EXTENSIONS = ['.pdf', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.webp'] as const;
export type SupportedDocumentExtension = (typeof SUPPORTED_DOCUMENT_EXTENSIONS)[number];

export function isSupportedDocumentExtension(extension: string): extension is SupportedDocumentExtension {
  return (SUPPORTED_DOCUMENT_EXTENSIONS as readonly string[]).includes(extension);
}

// Unterhalb dieser Zeichenzahl pro Seite gilt ein PDF als ohne Textlayer (Scan/Bild).
const MIN_TEXT_LENGTH_PER_PAGE = 20;
// Kostenschutz: verhindert unbegrenzt viele Vision-Calls für sehr lange Scans.
const MAX_SCANNED_PDF_PAGES = 10;

function imageMediaTypeFromExtension(extension: '.jpg' | '.jpeg' | '.png' | '.webp'): ImageMediaType {
  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
  }
}

export async function parseDocument(buffer: Buffer, extension: SupportedDocumentExtension): Promise<string> {
  switch (extension) {
    case '.pdf': {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text, totalPages } = await extractText(pdf, { mergePages: true });

      if (text.trim().length >= MIN_TEXT_LENGTH_PER_PAGE * totalPages) {
        return text;
      }

      // Kein (ausreichender) Textlayer gefunden: vermutlich gescanntes/bildbasiertes PDF.
      // Fallback macht diesen sonst kostenlosen, deterministischen Schritt bewusst
      // kostenpflichtig (Anthropic API) und nicht-deterministisch.
      if (totalPages > MAX_SCANNED_PDF_PAGES) {
        throw new Error(
          `Gescanntes PDF mit ${totalPages} Seiten überschreitet das Limit von ${MAX_SCANNED_PDF_PAGES} Seiten für Vision-Transkription`,
        );
      }

      const pageTexts: string[] = [];
      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        const png = await renderPageAsImage(pdf, pageNumber, {
          canvasImport: () => import('@napi-rs/canvas'),
        });
        pageTexts.push(await transcribeImage(Buffer.from(png), 'image/png'));
      }
      return pageTexts.join('\n\n');
    }
    case '.docx': {
      const { value } = await mammoth.extractRawText({ buffer });
      return value;
    }
    case '.txt':
      return buffer.toString('utf-8');
    case '.jpg':
    case '.jpeg':
    case '.png':
    case '.webp':
      return transcribeImage(buffer, imageMediaTypeFromExtension(extension));
  }
}

export async function parseDocumentById(documentId: string): Promise<void> {
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
    if (!isSupportedDocumentExtension(extension)) {
      throw new Error(`Nicht unterstütztes Dateiformat: ${extension}`);
    }

    const buffer = await readFile(path.resolve(document.storagePath));
    const extractedText = await parseDocument(buffer, extension);

    await db
      .update(documents)
      .set({ status: 'done', extractedText, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    await enqueueEmbedDocument(documentId);
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
