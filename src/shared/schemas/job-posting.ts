import { z } from 'zod';

export const EmploymentTypeSchema = z.enum([
  'full_time',
  'part_time',
  'internship',
  'working_student',
  'minijob',
  'freelance',
]);
export type EmploymentType = z.infer<typeof EmploymentTypeSchema>;

/**
 * Unified target schema for job postings that every connector adapter
 * (public API, paid API, Playwright scraper) maps to.
 */
export const JobPostingSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  remote: z.boolean().optional(),
  description: z.string(),
  url: z.url(),
  employmentType: EmploymentTypeSchema.optional(),
  postedAt: z.iso.datetime().optional(),
});
export type JobPosting = z.infer<typeof JobPostingSchema>;
