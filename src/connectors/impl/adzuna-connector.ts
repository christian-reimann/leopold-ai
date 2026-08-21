import { z } from 'zod';
import type { EmploymentType } from '@/shared/schemas/job-posting';
import { JobPostingSchema } from '@/shared/schemas/job-posting';
import type { SearchCriteria } from '@/shared/schemas/search-query';
import { BaseConnector } from '../base-connector';
import type { ConnectorResult } from '../connector';

const AdzunaJobSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  company: z.object({ display_name: z.string().optional() }).optional(),
  location: z.object({ display_name: z.string().optional() }).optional(),
  redirect_url: z.string().optional(),
  created: z.string().optional(),
  // Adzuna only ever returns a snippet, not the full posting text.
  description: z.string().optional(),
  contract_type: z.string().optional(), // "permanent" | "contract"
  contract_time: z.string().optional(), // "full_time" | "part_time"
});
type AdzunaJob = z.infer<typeof AdzunaJobSchema>;

const AdzunaSearchResponseSchema = z.object({
  results: z.array(AdzunaJobSchema),
  count: z.number().optional(),
});
type AdzunaSearchResponse = z.infer<typeof AdzunaSearchResponseSchema>;

/**
 * Official Adzuna job search API (developer.adzuna.com) – requires a free app_id/app_key
 * pair (ADZUNA_APP_ID/ADZUNA_APP_KEY). Covers Germany via the "de" country segment.
 */
export class AdzunaConnector extends BaseConnector<AdzunaJob> {
  private static readonly BASE_URL = 'https://api.adzuna.com/v1/api/jobs/de/search';
  private static readonly RESULTS_PER_PAGE = 50;
  private static readonly MAX_PAGES = 10;
  private static readonly MAX_DAYS_OLD = 28;
  private static readonly REQUEST_DELAY_MS = 500;
  private static readonly MAX_RETRY_ATTEMPTS = 5;
  private static readonly RETRY_BASE_DELAY_MS = 2000;

  readonly id = 'adzuna';
  readonly userAgent = 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0';

  protected async fetchRaw(criteria: SearchCriteria): Promise<AdzunaJob[]> {
    const jobs = await this.searchJobs(criteria);
    return criteria.remote ? jobs.filter((job) => AdzunaConnector.matchesRemote(job)) : jobs;
  }

  protected mapResult(raw: AdzunaJob): ConnectorResult | undefined {
    const candidate = {
      title: raw.title,
      company: raw.company?.display_name,
      location: raw.location?.display_name,
      description: raw.description ?? '',
      url: raw.redirect_url,
      employmentType: AdzunaConnector.mapEmploymentType(raw),
      postedAt: raw.created,
    };

    const parsed = JobPostingSchema.safeParse(candidate);
    if (!parsed.success) {
      return undefined;
    }

    return {
      sourceId: raw.id,
      posting: parsed.data,
      rawHtml: JSON.stringify(raw),
    };
  }

  // Fetches pages until `count` is reached, a page comes back short, or MAX_PAGES is hit.
  private async searchJobs(criteria: SearchCriteria): Promise<AdzunaJob[]> {
    const { appId, appKey } = AdzunaConnector.credentials();
    const jobs: AdzunaJob[] = [];
    let page = 1;
    let total = Number.POSITIVE_INFINITY;

    while (jobs.length < total && page <= AdzunaConnector.MAX_PAGES) {
      if (page > 1) {
        await AdzunaConnector.delay(AdzunaConnector.REQUEST_DELAY_MS);
      }
      const response = await this.fetchPage(criteria, page, appId, appKey);
      if (response.results.length === 0) {
        break;
      }
      jobs.push(...response.results);
      total = response.count ?? jobs.length;
      page++;
    }

    return jobs;
  }

  // Retries on HTTP 429 with exponential backoff.
  private async fetchPage(
    criteria: SearchCriteria,
    page: number,
    appId: string,
    appKey: string,
  ): Promise<AdzunaSearchResponse> {
    const params = AdzunaConnector.buildSearchParams(criteria, appId, appKey);
    const url = `${AdzunaConnector.BASE_URL}/${page}?${params.toString()}`;

    for (let attempt = 0; ; attempt++) {
      console.log(
        `[${new Date().toISOString()}] [${this.id}] Search request: ${AdzunaConnector.redact(url)} (attempt ${attempt + 1})`,
      );
      const response = await fetch(url, { headers: { 'User-Agent': this.userAgent } });

      if (response.status === 429) {
        if (attempt >= AdzunaConnector.MAX_RETRY_ATTEMPTS) {
          throw new Error(`adzuna search failed (429): rate limited after ${attempt + 1} attempts`);
        }
        const backoffMs = AdzunaConnector.RETRY_BASE_DELAY_MS * 2 ** attempt;
        console.warn(`[${this.id}] Rate limited on page ${page}, retrying in ${backoffMs}ms`);
        await AdzunaConnector.delay(backoffMs);
        continue;
      }

      if (!response.ok) {
        throw new Error(`adzuna search failed (${response.status}): ${await response.text()}`);
      }

      const parsed = AdzunaSearchResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        throw new Error(`adzuna search: unexpected response format: ${parsed.error.message}`);
      }
      return parsed.data;
    }
  }

  private static credentials(): { appId: string; appKey: string } {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    if (!appId || !appKey) {
      throw new Error('adzuna search failed: ADZUNA_APP_ID/ADZUNA_APP_KEY not configured');
    }
    return { appId, appKey };
  }

  private static buildSearchParams(criteria: SearchCriteria, appId: string, appKey: string): URLSearchParams {
    const params = new URLSearchParams();
    params.set('app_id', appId);
    params.set('app_key', appKey);
    params.set('content-type', 'application/json');
    params.set('results_per_page', String(AdzunaConnector.RESULTS_PER_PAGE));
    params.set('max_days_old', String(AdzunaConnector.MAX_DAYS_OLD));

    if (criteria.keywords.length > 0) {
      params.set('what', criteria.keywords.join(' '));
    }
    if (criteria.location) {
      params.set('where', criteria.location);
    }
    if (criteria.radiusKm !== undefined) {
      params.set('distance', String(criteria.radiusKm));
    }

    // Adzuna's full_time/part_time flags are independent booleans, not a list – only
    // set one when the criteria unambiguously ask for it.
    if (criteria.employmentTypes?.includes('part_time') && !criteria.employmentTypes.includes('full_time')) {
      params.set('part_time', '1');
    } else if (criteria.employmentTypes?.includes('full_time') && !criteria.employmentTypes.includes('part_time')) {
      params.set('full_time', '1');
    }
    if (criteria.employmentTypes?.includes('freelance')) {
      params.set('contract', '1');
    }

    return params;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private static matchesRemote(job: AdzunaJob): boolean {
    const haystack = AdzunaConnector.normalize(
      `${job.title ?? ''} ${job.location?.display_name ?? ''} ${job.description ?? ''}`,
    );
    return haystack.includes('remote') || haystack.includes('homeoffice') || haystack.includes('home office');
  }

  private static mapEmploymentType(raw: AdzunaJob): EmploymentType | undefined {
    const title = AdzunaConnector.normalize(raw.title ?? '');

    // Adzuna has no structured field for these – title keywords are the only signal.
    if (title.includes('praktik') || title.includes('intern')) return 'internship';
    if (title.includes('werkstudent') || title.includes('student')) return 'working_student';

    if (raw.contract_type === 'contract') return 'freelance';
    if (raw.contract_time === 'part_time') return 'part_time';
    //if (raw.contract_time === 'full_time' || raw.contract_type === 'permanent') return 'full_time';
    return 'full_time';
  }

  private static normalize(text: string): string {
    return text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  // Keeps app_id/app_key out of logs.
  private static redact(url: string): string {
    return url.replace(/([?&](?:app_id|app_key)=)[^&]+/g, '$1***');
  }
}
