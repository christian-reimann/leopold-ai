import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { jobPostings } from './job-postings';

export const applicationStatusEnum = pgEnum('application_status', ['draft', 'final', 'submitted']);

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobPostings.id, { onDelete: 'cascade' }),
  cvContent: text('cv_content'),
  letterContent: text('letter_content'),
  status: applicationStatusEnum('status').notNull().default('draft'),
  pdfPath: text('pdf_path'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
