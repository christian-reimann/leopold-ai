import { z } from 'zod';
import type { EmploymentType } from '@/shared/schemas/job-posting';
import { JobPostingSchema } from '@/shared/schemas/job-posting';
import type { SearchCriteria } from '@/shared/schemas/search-query';
import { BaseConnector } from '../base-connector';
import type { ConnectorResult } from '../connector';

const JobListingSchema = z.object({
  slug: z.string(),
  title: z.string().optional(),
  company_name: z.string().optional(),
  description: z.string().optional(),
  remote: z.boolean().optional(),
  url: z.string().optional(),
  // arbeitnow occasionally serializes an empty job_types array as `{}` instead of `[]` (PHP quirk).
  job_types: z.preprocess((value) => (Array.isArray(value) ? value : []), z.array(z.string())).optional(),
  location: z.string().optional(),
  created_at: z.number(),
});
type JobListing = z.infer<typeof JobListingSchema>;

const JobBoardResponseSchema = z.object({
  data: z.array(JobListingSchema),
  links: z
    .object({
      next: z.string().nullable().optional(),
    })
    .optional(),
});
type JobBoardResponse = z.infer<typeof JobBoardResponseSchema>;

const GERMAN_CITY_ALIASES: Partial<Record<string, string[]>> = {
  munchen: ['munich'],
  koln: ['cologne'],
  nurnberg: ['nuremberg'],
  hannover: ['hanover'],
  braunschweig: ['brunswick'],
};

export class ArbeitnowConnector extends BaseConnector<JobListing> {
  private static readonly BASE_URL = 'https://www.arbeitnow.com/api/job-board-api';
  private static readonly MAX_AGE_MS = 28 * 24 * 60 * 60 * 1000;
  private static readonly REQUEST_DELAY_MS = 1000;
  private static readonly MAX_RETRY_ATTEMPTS = 5;
  private static readonly RETRY_BASE_DELAY_MS = 2000;

  readonly id = 'arbeitnow';
  readonly userAgent = 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0';

  protected async fetchRaw(criteria: SearchCriteria): Promise<JobListing[]> {
    const listings = await this.fetchRecentListings();
    return listings.filter((listing) => ArbeitnowConnector.matchesCriteria(listing, criteria));
  }

  protected mapResult(raw: JobListing): ConnectorResult | undefined {
    const candidate = {
      title: raw.title,
      company: raw.company_name,
      location: raw.location || undefined,
      remote: raw.remote,
      description: ArbeitnowConnector.stripHtml(raw.description ?? ''),
      url: raw.url,
      employmentType: ArbeitnowConnector.mapEmploymentType(raw.job_types ?? []),
      postedAt: new Date(raw.created_at * 1000).toISOString(),
    };

    const parsed = JobPostingSchema.safeParse(candidate);
    if (!parsed.success) {
      return undefined;
    }

    return {
      sourceId: raw.slug,
      posting: parsed.data,
      rawHtml: JSON.stringify(raw),
    };
  }

  private async fetchRecentListings(): Promise<JobListing[]> {
    const cutoff = Date.now() - ArbeitnowConnector.MAX_AGE_MS;
    const listings: JobListing[] = [];
    let page = 1;

    while (true) {
      if (page > 1) {
        await ArbeitnowConnector.delay(ArbeitnowConnector.REQUEST_DELAY_MS);
      }

      const pageData = await this.fetchPage(page);
      const pageItems = pageData.data;
      if (pageItems.length === 0) {
        break;
      }

      let reachedCutoff = false;
      for (const listing of pageItems) {
        if (listing.created_at * 1000 < cutoff) {
          reachedCutoff = true;
          break;
        }
        listings.push(listing);
      }

      if (reachedCutoff || !pageData.links?.next) {
        break;
      }
      page += 1;
    }

    return listings;
  }

  // Retries on HTTP 429 with exponential backoff
  private async fetchPage(page: number): Promise<JobBoardResponse> {
    const url = `${ArbeitnowConnector.BASE_URL}?page=${page}`;

    for (let attempt = 0; ; attempt++) {
      console.log(`[${new Date().toISOString()}] [${this.id}] Search request: ${url} (attempt ${attempt + 1})`);
      const response = await fetch(url, { headers: { 'User-Agent': this.userAgent } });

      if (response.status === 429) {
        if (attempt >= ArbeitnowConnector.MAX_RETRY_ATTEMPTS) {
          throw new Error(`arbeitnow search failed (429): rate limited after ${attempt + 1} attempts`);
        }
        const backoffMs = ArbeitnowConnector.RETRY_BASE_DELAY_MS * 2 ** attempt;
        console.warn(`[${this.id}] Rate limited on page ${page}, retrying in ${backoffMs}ms`);
        await ArbeitnowConnector.delay(backoffMs);
        continue;
      }

      if (!response.ok) {
        throw new Error(`arbeitnow search failed (${response.status}): ${await response.text()}`);
      }

      const parsed = JobBoardResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        throw new Error(`arbeitnow search: unexpected response format: ${parsed.error.message}`);
      }
      return parsed.data;
    }
  }

  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private static matchesCriteria(listing: JobListing, criteria: SearchCriteria): boolean {
    return (
      ArbeitnowConnector.matchesKeywords(listing, criteria) &&
      ArbeitnowConnector.matchesLocation(listing, criteria) &&
      ArbeitnowConnector.matchesRemote(listing, criteria) &&
      ArbeitnowConnector.matchesEmploymentType(listing, criteria)
    );
  }

  private static matchesKeywords(listing: JobListing, criteria: SearchCriteria): boolean {
    if (criteria.keywords.length === 0) {
      return true;
    }
    const haystack = ArbeitnowConnector.normalize(listing.title ?? '');
    return criteria.keywords.some((keyword) => haystack.includes(ArbeitnowConnector.normalize(keyword)));
  }

  private static matchesLocation(listing: JobListing, criteria: SearchCriteria): boolean {
    if (!criteria.location) {
      return true;
    }
    const normCriteria = ArbeitnowConnector.normalize(criteria.location);
    const normRaw = ArbeitnowConnector.normalize(listing.location ?? '');
    if (normRaw.includes(normCriteria)) {
      return true;
    }
    return (GERMAN_CITY_ALIASES[normCriteria] ?? []).some((alias) => normRaw.includes(alias));
  }

  private static matchesRemote(listing: JobListing, criteria: SearchCriteria): boolean {
    if (criteria.remote !== true) {
      return true;
    }
    if (listing.remote) {
      return true;
    }
    const normLocation = ArbeitnowConnector.normalize(listing.location ?? '');
    return (
      normLocation.includes('remote') || normLocation.includes('homeoffice') || normLocation.includes('home office')
    );
  }

  private static matchesEmploymentType(listing: JobListing, criteria: SearchCriteria): boolean {
    if (!criteria.employmentTypes || criteria.employmentTypes.length === 0) {
      return true;
    }
    const mapped = ArbeitnowConnector.mapEmploymentType(listing.job_types ?? []);
    return mapped !== undefined && criteria.employmentTypes.includes(mapped);
  }

  private static mapEmploymentType(jobTypes: string[]): EmploymentType {
    const normalized = jobTypes.map((type) => ArbeitnowConnector.normalize(type));

    if (normalized.some((type) => type.includes('intern'))) return 'internship';
    if (
      normalized.some(
        (type) => type.includes('working student') || type.includes('werkstudent') || type.includes('student'),
      )
    ) {
      return 'working_student';
    }
    if (normalized.some((type) => type.includes('freelance') || type.includes('contract'))) return 'freelance';
    if (normalized.some((type) => type.includes('part'))) return 'part_time';
    //if (normalized.some((type) => type.includes('full') || type.includes('permanent'))) return 'full_time';
    return 'full_time';
  }

  private static normalize(text: string): string {
    return text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  private static stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
}
