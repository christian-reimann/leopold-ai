import { describe, expect, it } from 'vitest';
import { EmploymentTypeSchema, ProfileSchema } from '@/shared/schemas/profile';
import { buildProfile } from '../../fixtures/shared';

describe('ProfileSchema', () => {
  it('parses a valid profile', () => {
    const result = ProfileSchema.safeParse(buildProfile());
    expect(result.success).toBe(true);
  });

  it('rejects an invalid contact email', () => {
    const profile = buildProfile();
    const result = ProfileSchema.safeParse({
      ...profile,
      personal: { ...profile.personal, contact: { ...profile.personal.contact, email: 'not-an-email' } },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown language level', () => {
    const profile = buildProfile({ languages: [{ language: 'Deutsch', level: 'C3' as never }] });
    expect(ProfileSchema.safeParse(profile).success).toBe(false);
  });

  it.each(['full-time', 'part-time', 'contract', 'freelance', 'internship', 'temporary'])(
    'accepts employmentType "%s"',
    (employmentType) => {
      expect(EmploymentTypeSchema.safeParse(employmentType).success).toBe(true);
    },
  );

  it('rejects the job-posting schema\'s underscored employmentType values (schemas are not interchangeable)', () => {
    // job-posting.ts's EmploymentTypeSchema uses 'full_time' (underscore); profile.ts uses
    // 'full-time' (hyphen) - two independent enums, see tests/fixtures/shared/index.ts.
    expect(EmploymentTypeSchema.safeParse('full_time').success).toBe(false);
  });
});
