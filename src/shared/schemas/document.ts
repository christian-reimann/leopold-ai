import { z } from 'zod';

export const DOCUMENT_TYPES = ['cv', 'cover_letter', 'certificate'] as const;
export const DocumentTypeSchema = z.enum(DOCUMENT_TYPES);
export type DocumentType = z.infer<typeof DocumentTypeSchema>;

export const DOCUMENT_STATUSES = ['pending', 'processing', 'done', 'failed'] as const;
export const DocumentStatusSchema = z.enum(DOCUMENT_STATUSES);
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;
