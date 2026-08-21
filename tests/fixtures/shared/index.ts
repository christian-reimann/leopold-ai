import type { JobPosting } from '@/shared/schemas/job-posting';
import type { MatchResult } from '@/shared/schemas/match';
import type { Profile } from '@/shared/schemas/profile';
import type { SearchCriteria } from '@/shared/schemas/search-query';

export function buildProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    personal: {
      name: 'Erika Musterfrau',
      role: 'Softwareentwicklerin',
      address: { street: 'Musterstr. 1', zipcode: '20095', location: 'Hamburg', country: 'DE' },
      contact: { email: 'erika@example.com', phone: '+49 176 00000000' },
    },
    education: [],
    experiences: [
      {
        role: 'Entwicklerin',
        company: 'Musterfirma GmbH',
        employmentType: 'full-time',
        startDate: '2020',
        description: 'Backend-Entwicklung',
      },
    ],
    projects: [],
    skills: [{ name: 'Sprachen', skills: ['TypeScript', 'SQL'] }],
    strengths: [],
    languages: [{ language: 'Deutsch', level: 'native' }],
    interests: [],
    ...overrides,
  };
}

/**
 * Note: employmentType here uses underscore notation ('full_time'), unlike
 * buildProfile()'s Experience.employmentType, which uses hyphen notation ('full-time')
 * (two independent EmploymentTypeSchema definitions, see job-posting.ts vs. profile.ts).
 * Not interchangeable - see tests/shared/schemas/*.test.ts for the regression test on this.
 */
export function buildJobPosting(overrides: Partial<JobPosting> = {}): JobPosting {
  return {
    title: 'Java Developer',
    company: 'Musterfirma GmbH',
    location: 'Hamburg',
    description: 'Wir suchen eine Java-Entwicklerin.',
    url: 'https://example.com/jobs/1',
    employmentType: 'full_time',
    ...overrides,
  };
}

export function buildSearchCriteria(overrides: Partial<SearchCriteria> = {}): SearchCriteria {
  return {
    keywords: ['Java Developer'],
    location: 'Hamburg',
    radiusKm: 10,
    ...overrides,
  };
}

export function buildMatchResult(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    scoreMeToJob: 75,
    positives: [{ text: 'Passendes Skillset', weight: 3 }],
    negatives: [{ text: 'Kein Homeoffice', weight: 1 }],
    ...overrides,
  };
}

export function randomEmbedding(dimensions = 1024): number[] {
  return Array.from({ length: dimensions }, () => Math.random());
}
