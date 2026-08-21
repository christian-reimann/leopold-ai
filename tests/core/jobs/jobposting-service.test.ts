import { describe, expect, it } from 'vitest';
import { jobPostingService } from '@/core/jobs/jobposting-service';
import type { JobPosting } from '@/shared/schemas/job-posting';
import { buildJobPosting } from '../../fixtures/shared';

// computeDedupeHash/normalizeForDedupe are private but pure methods with no I/O - accessed
// via cast instead of changing visibility in production code.
const service = jobPostingService as unknown as {
  computeDedupeHash: (posting: JobPosting) => string;
  normalizeForDedupe: (value: string) => string;
};

describe('JobPostingService.normalizeForDedupe', () => {
  it('lowercases, trims and collapses whitespace', () => {
    expect(service.normalizeForDedupe.call(jobPostingService, '  Java   Developer  ')).toBe('java developer');
  });
});

describe('JobPostingService.computeDedupeHash', () => {
  const hash = (posting: JobPosting) => service.computeDedupeHash.call(jobPostingService, posting);

  it('produces the same hash for postings that only differ in whitespace/case', () => {
    const a = buildJobPosting({ title: 'Java Developer', company: 'Musterfirma GmbH', location: 'Hamburg' });
    const b = buildJobPosting({ title: '  java   developer', company: 'MUSTERFIRMA gmbh', location: 'hamburg  ' });
    expect(hash(a)).toBe(hash(b));
  });

  it('produces a different hash when the title differs', () => {
    const a = buildJobPosting({ title: 'Java Developer' });
    const b = buildJobPosting({ title: 'Python Developer' });
    expect(hash(a)).not.toBe(hash(b));
  });

  it('is independent of the description (only title/company/location are hashed)', () => {
    const a = buildJobPosting({ description: 'Beschreibung A' });
    const b = buildJobPosting({ description: 'Ganz andere Beschreibung B' });
    expect(hash(a)).toBe(hash(b));
  });
});
