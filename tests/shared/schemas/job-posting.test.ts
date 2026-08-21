import { describe, expect, it } from 'vitest';
import { EmploymentTypeSchema, JobPostingSchema } from '@/shared/schemas/job-posting';
import { buildJobPosting } from '../../fixtures/shared';

describe('JobPostingSchema', () => {
  it('parses a valid job posting', () => {
    const result = JobPostingSchema.safeParse(buildJobPosting());
    expect(result.success).toBe(true);
  });

  it('accepts a posting without the optional fields', () => {
    const result = JobPostingSchema.safeParse({
      title: 'Java Developer',
      company: 'Musterfirma GmbH',
      description: 'Wir suchen eine Java-Entwicklerin.',
      url: 'https://example.com/jobs/1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid URL', () => {
    const result = JobPostingSchema.safeParse(buildJobPosting({ url: 'not-a-url' }));
    expect(result.success).toBe(false);
  });

  it('rejects a non-ISO postedAt value', () => {
    const result = JobPostingSchema.safeParse(buildJobPosting({ postedAt: '21.08.2026' }));
    expect(result.success).toBe(false);
  });

  it.each(['full_time', 'part_time', 'internship', 'working_student', 'minijob', 'freelance'])(
    'accepts employmentType "%s"',
    (employmentType) => {
      expect(EmploymentTypeSchema.safeParse(employmentType).success).toBe(true);
    },
  );

  it('rejects the profile schema\'s hyphenated employmentType values (schemas are not interchangeable)', () => {
    // profile.ts's EmploymentTypeSchema uses 'full-time' (hyphen); job-posting.ts uses
    // 'full_time' (underscore) - two independent enums, see tests/fixtures/shared/index.ts.
    expect(EmploymentTypeSchema.safeParse('full-time').success).toBe(false);
  });
});
