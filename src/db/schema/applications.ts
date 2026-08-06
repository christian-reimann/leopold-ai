import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import {
  APPLICATION_COLOR_SCHEMES,
  APPLICATION_LANGUAGES,
  APPLICATION_LAYOUT_IDS,
  APPLICATION_STATUSES,
  APPLICATION_TONES,
  PERSONALITY_TRAITS,
} from '@/shared/schemas/application';
import { DOCUMENT_STATUSES } from '@/shared/schemas/document';
import { jobPostings } from './job-postings';

export const applicationStatusEnum = pgEnum('application_status', APPLICATION_STATUSES);
export const applicationToneEnum = pgEnum('application_tone', APPLICATION_TONES);
export const applicationLanguageEnum = pgEnum('application_language', APPLICATION_LANGUAGES);
export const applicationLayoutEnum = pgEnum('application_layout', APPLICATION_LAYOUT_IDS);
export const applicationColorSchemeEnum = pgEnum('application_color_scheme', APPLICATION_COLOR_SCHEMES);
export const applicationGenerationStatusEnum = pgEnum('application_generation_status', DOCUMENT_STATUSES);
export const personalityTraitEnum = pgEnum('personality_trait', PERSONALITY_TRAITS);

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobPostings.id, { onDelete: 'cascade' }),
  tone: applicationToneEnum('tone').notNull().default('neutral'),
  personality: personalityTraitEnum('personality').array().notNull().default([]),
  language: applicationLanguageEnum('language').notNull().default('de'),
  layoutTemplate: applicationLayoutEnum('layout_template').notNull().default('standard'),
  colorScheme: applicationColorSchemeEnum('color_scheme').notNull().default('slate'),
  // Ab hier TipTap-editierbares HTML statt reinem Freitext.
  cvContent: text('cv_content'),
  letterContent: text('letter_content'),
  generationStatus: applicationGenerationStatusEnum('generation_status').notNull().default('pending'),
  generationError: text('generation_error'),
  status: applicationStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
