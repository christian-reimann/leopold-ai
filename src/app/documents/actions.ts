'use server';

import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { documentService } from '@/core/documents/document-service';
import { documentQueue } from '@/core/queue/document-queue';
import { db } from '@/db/client';
import { documents } from '@/db/schema/documents';
import { DocumentTypeSchema } from '@/shared/schemas/document';

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'uploads');

const UploadDocumentSchema = z.object({
  type: DocumentTypeSchema,
  file: z.instanceof(File),
});

export async function uploadDocument(formData: FormData): Promise<void> {
  const { type, file } = UploadDocumentSchema.parse({
    type: formData.get('type'),
    file: formData.get('file'),
  });

  const extension = path.extname(file.name).toLowerCase();
  if (!documentService.isSupportedDocumentExtension(extension)) {
    throw new Error(`Nicht unterstütztes Dateiformat: ${extension}`);
  }

  await mkdir(STORAGE_DIR, { recursive: true });
  const storagePath = path.join('storage', 'uploads', `${randomUUID()}-${file.name}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(process.cwd(), storagePath), buffer);

  const [document] = await db.insert(documents).values({ type, storagePath }).returning({
    id: documents.id,
  });
  if (!document) {
    throw new Error('Dokument konnte nicht angelegt werden');
  }

  await documentQueue.enqueueParseDocument(document.id);
  revalidatePath('/documents');
}

const DocumentIdSchema = z.uuid();

export async function extractProfileAction(documentIds: string[]): Promise<void> {
  const ids = z.array(DocumentIdSchema).min(1).parse(documentIds);
  await documentQueue.enqueueExtractProfile(ids);
  revalidatePath('/documents');
}

export async function removeDocumentAction(documentId: string): Promise<void> {
  const id = DocumentIdSchema.parse(documentId);

  const [document] = await db.select().from(documents).where(eq(documents.id, id));
  if (!document) {
    return;
  }

  await db.delete(documents).where(eq(documents.id, id));
  await rm(path.join(process.cwd(), document.storagePath), { force: true });

  revalidatePath('/documents');
}
