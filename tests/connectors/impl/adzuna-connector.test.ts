import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AdzunaConnector } from '@/connectors/impl/adzuna-connector';
import { buildSearchCriteria } from '../../fixtures/shared';

// Private static helpers with no I/O - accessed via cast on the class instead of
// changing visibility in production code (see plan: "no invasive production code changes").
type AdzunaJob = { title?: string; location?: { display_name?: string }; description?: string };
const helpers = AdzunaConnector as unknown as {
  matchesRemote: (job: AdzunaJob) => boolean;
  mapEmploymentType: (job: { title?: string; contract_type?: string; contract_time?: string }) => string;
  normalize: (text: string) => string;
  buildSearchParams: (criteria: ReturnType<typeof buildSearchCriteria>, appId: string, appKey: string) => URLSearchParams;
  redact: (url: string) => string;
};

describe('AdzunaConnector.matchesRemote', () => {
  it('matches "remote" in the title', () => {
    expect(helpers.matchesRemote({ title: 'Remote Java Developer' })).toBe(true);
  });

  it('matches "Homeoffice" case-insensitively', () => {
    expect(helpers.matchesRemote({ title: 'Java Developer', description: '100% Homeoffice möglich' })).toBe(true);
  });

  it('matches "home office" written as two words', () => {
    expect(helpers.matchesRemote({ description: 'work from home office' })).toBe(true);
  });

  it('returns false when nothing indicates remote work', () => {
    expect(helpers.matchesRemote({ title: 'Java Developer', location: { display_name: 'Hamburg' } })).toBe(false);
  });
});

describe('AdzunaConnector.mapEmploymentType', () => {
  it('maps "Praktikum" in the title to internship', () => {
    expect(helpers.mapEmploymentType({ title: 'Praktikum Softwareentwicklung' })).toBe('internship');
  });

  it('maps "Werkstudent" in the title to working_student', () => {
    expect(helpers.mapEmploymentType({ title: 'Werkstudent (m/w/d) Backend' })).toBe('working_student');
  });

  it('maps contract_type "contract" to freelance', () => {
    expect(helpers.mapEmploymentType({ title: 'Java Developer', contract_type: 'contract' })).toBe('freelance');
  });

  it('maps contract_time "part_time" to part_time', () => {
    expect(helpers.mapEmploymentType({ title: 'Java Developer', contract_time: 'part_time' })).toBe('part_time');
  });

  it('defaults to full_time when no signal matches', () => {
    expect(helpers.mapEmploymentType({ title: 'Java Developer' })).toBe('full_time');
  });
});

describe('AdzunaConnector.normalize', () => {
  it('lowercases and strips diacritics', () => {
    expect(helpers.normalize('Möglichkeit')).toBe('moglichkeit');
  });
});

describe('AdzunaConnector.buildSearchParams', () => {
  it('sets keywords, location and radius', () => {
    const params = helpers.buildSearchParams(
      buildSearchCriteria({ keywords: ['Java', 'Developer'], location: 'Hamburg', radiusKm: 15 }),
      'app-id',
      'app-key',
    );
    expect(params.get('what')).toBe('Java Developer');
    expect(params.get('where')).toBe('Hamburg');
    expect(params.get('distance')).toBe('15');
    expect(params.get('app_id')).toBe('app-id');
    expect(params.get('app_key')).toBe('app-key');
  });

  it('sets full_time=1 only when full_time is requested without part_time', () => {
    const params = helpers.buildSearchParams(
      buildSearchCriteria({ employmentTypes: ['full_time'] }),
      'app-id',
      'app-key',
    );
    expect(params.get('full_time')).toBe('1');
    expect(params.get('part_time')).toBeNull();
  });

  it('sets neither full_time nor part_time when both are requested (ambiguous)', () => {
    const params = helpers.buildSearchParams(
      buildSearchCriteria({ employmentTypes: ['full_time', 'part_time'] }),
      'app-id',
      'app-key',
    );
    expect(params.get('full_time')).toBeNull();
    expect(params.get('part_time')).toBeNull();
  });

  it('sets contract=1 for freelance', () => {
    const params = helpers.buildSearchParams(
      buildSearchCriteria({ employmentTypes: ['freelance'] }),
      'app-id',
      'app-key',
    );
    expect(params.get('contract')).toBe('1');
  });
});

describe('AdzunaConnector.redact', () => {
  it('redacts app_id and app_key from a URL', () => {
    const url = 'https://api.adzuna.com/v1/api/jobs/de/search/1?app_id=secret-id&app_key=secret-key&what=java';
    expect(helpers.redact(url)).toBe(
      'https://api.adzuna.com/v1/api/jobs/de/search/1?app_id=***&app_key=***&what=java',
    );
  });
});

const server = setupServer();

function adzunaJob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'job-1',
    title: 'Java Developer',
    company: { display_name: 'Musterfirma GmbH' },
    location: { display_name: 'Hamburg' },
    redirect_url: 'https://example.com/jobs/1',
    description: 'Wir suchen eine Java-Entwicklerin.',
    ...overrides,
  };
}

describe('AdzunaConnector.search', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('maps results and stops once the reported total is reached', async () => {
    server.use(
      http.get('https://api.adzuna.com/v1/api/jobs/de/search/:page', ({ params }) => {
        if (params.page === '1') {
          return HttpResponse.json({ results: [adzunaJob({ id: 'job-1' })], count: 1 });
        }
        throw new Error(`unexpected page requested: ${params.page}`);
      }),
    );
    vi.stubEnv('ADZUNA_APP_ID', 'app-id');
    vi.stubEnv('ADZUNA_APP_KEY', 'app-key');

    const results = await new AdzunaConnector().search(buildSearchCriteria());

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ sourceId: 'job-1', posting: { title: 'Java Developer' } });
  });

  it('follows pagination across multiple pages when count exceeds the first page', async () => {
    server.use(
      http.get('https://api.adzuna.com/v1/api/jobs/de/search/:page', ({ params }) => {
        if (params.page === '1') {
          return HttpResponse.json({ results: [adzunaJob({ id: 'job-1' })], count: 2 });
        }
        if (params.page === '2') {
          return HttpResponse.json({ results: [adzunaJob({ id: 'job-2' })], count: 2 });
        }
        throw new Error(`unexpected page requested: ${params.page}`);
      }),
    );
    vi.stubEnv('ADZUNA_APP_ID', 'app-id');
    vi.stubEnv('ADZUNA_APP_KEY', 'app-key');

    const results = await new AdzunaConnector().search(buildSearchCriteria());

    expect(results.map((r) => r.sourceId).sort()).toEqual(['job-1', 'job-2']);
  });

  it('retries once on HTTP 429 and then succeeds', async () => {
    let attempts = 0;
    server.use(
      http.get('https://api.adzuna.com/v1/api/jobs/de/search/:page', () => {
        attempts++;
        if (attempts === 1) {
          return new HttpResponse('rate limited', { status: 429 });
        }
        return HttpResponse.json({ results: [adzunaJob()], count: 1 });
      }),
    );
    vi.stubEnv('ADZUNA_APP_ID', 'app-id');
    vi.stubEnv('ADZUNA_APP_KEY', 'app-key');

    const results = await new AdzunaConnector().search(buildSearchCriteria());

    expect(attempts).toBe(2);
    expect(results).toHaveLength(1);
  });

  it('runs one search per keyword and dedupes jobs matched by more than one keyword', async () => {
    const requestedWhats: string[] = [];
    server.use(
      http.get('https://api.adzuna.com/v1/api/jobs/de/search/:page', ({ request, params }) => {
        expect(params.page).toBe('1');
        const what = new URL(request.url).searchParams.get('what');
        requestedWhats.push(what ?? '');
        if (what === 'ai engineer') {
          return HttpResponse.json({
            results: [adzunaJob({ id: 'job-1' }), adzunaJob({ id: 'job-shared' })],
            count: 2,
          });
        }
        if (what === 'forward deployed engineer') {
          return HttpResponse.json({
            results: [adzunaJob({ id: 'job-shared' }), adzunaJob({ id: 'job-2' })],
            count: 2,
          });
        }
        throw new Error(`unexpected query: ${what}`);
      }),
    );
    vi.stubEnv('ADZUNA_APP_ID', 'app-id');
    vi.stubEnv('ADZUNA_APP_KEY', 'app-key');

    const results = await new AdzunaConnector().search(
      buildSearchCriteria({ keywords: ['ai engineer', 'forward deployed engineer'] }),
    );

    expect(requestedWhats).toEqual(['ai engineer', 'forward deployed engineer']);
    expect(results.map((r) => r.sourceId).sort()).toEqual(['job-1', 'job-2', 'job-shared']);
  });

  it('drops raw items that fail JobPostingSchema validation and reports them via lastRunStats', async () => {
    server.use(
      http.get('https://api.adzuna.com/v1/api/jobs/de/search/:page', () =>
        // no redirect_url -> mapResult()'s JobPostingSchema.safeParse fails (url is required)
        HttpResponse.json({ results: [adzunaJob({ id: 'job-bad', redirect_url: undefined })], count: 1 }),
      ),
    );
    vi.stubEnv('ADZUNA_APP_ID', 'app-id');
    vi.stubEnv('ADZUNA_APP_KEY', 'app-key');

    const connector = new AdzunaConnector();
    const results = await connector.search(buildSearchCriteria());

    expect(results).toHaveLength(0);
    expect(connector.lastRunStats).toMatchObject({ rawCount: 1, mappedCount: 0, droppedCount: 1 });
  });
});
