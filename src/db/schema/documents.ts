import { DOCUMENT_STATUSES, DOCUMENT_TYPES } from '@/shared/schemas/document';
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const documentTypeEnum = pgEnum('document_type', DOCUMENT_TYPES);
export const documentStatusEnum = pgEnum('document_status', DOCUMENT_STATUSES);

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  type: documentTypeEnum('type').notNull(),
  storagePath: text('storage_path').notNull(),
  originalFilename: text('original_filename').notNull(),
  extractedText: text('extracted_text'),
  status: documentStatusEnum('status').notNull().default('pending'),
  error: text('error'),
  embeddingStatus: documentStatusEnum('embedding_status').notNull().default('pending'),
  embeddingError: text('embedding_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
