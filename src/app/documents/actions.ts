'use server';

import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { documentService } from '@/core/documents/document-service';
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

  await documentService.createDocument({ type, storagePath });
  revalidatePath('/documents');
}

const DocumentIdSchema = z.uuid();

export async function extractProfileAction(documentIds: string[]): Promise<void> {
  const ids = z.array(DocumentIdSchema).min(1).parse(documentIds);
  await documentService.requestProfileExtraction(ids);
  revalidatePath('/documents');
}

export async function removeDocumentAction(documentId: string): Promise<void> {
  const id = DocumentIdSchema.parse(documentId);

  const storagePath = await documentService.deleteDocument(id);
  if (!storagePath) {
    return;
  }

  await rm(path.join(process.cwd(), storagePath), { force: true });
  revalidatePath('/documents');
}
