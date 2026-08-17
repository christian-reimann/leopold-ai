import { z } from 'zod';
import type { EmploymentType } from '@/shared/schemas/job-posting';
import { JobPostingSchema } from '@/shared/schemas/job-posting';
import type { SearchCriteria } from '@/shared/schemas/search-query';
import { BaseConnector } from '../base-connector';
import type { ConnectorResult, SourceIdLookup } from '../connector';

/**
 * Unofficial connector for get-in-it.de. The site offers no keyword search – jobs are
 * filtered exclusively via fixed career fields (thematicPriority).
 */
const CareerRefSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const JobListingSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  url: z.string().optional(),
  homeOffice: z.boolean().optional(),
  careers: z.array(CareerRefSchema).optional(),
  locations: z.array(CareerRefSchema).optional(),
  company: z
    .object({
      id: z.number(),
      title: z.string().optional(),
    })
    .optional(),
});
type JobListing = z.infer<typeof JobListingSchema>;

const SearchApiResponseSchema = z.object({
  total: z.number(),
  items: z.object({
    results: z.array(JobListingSchema),
  }),
});

const JobDetailNextDataSchema = z.object({
  props: z.object({
    initialState: z.object({
      jobJob: z.object({
        job: z.object({
          metaData: z.array(z.object({ type: z.string(), content: z.string() })),
          header: z.object({ applyUrl: z.string().optional() }).optional(),
        }),
      }),
    }),
  }),
});

const JobPostingLdSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  datePosted: z.string().optional(),
  employmentType: z.string().optional(),
});
type JobPostingLd = z.infer<typeof JobPostingLdSchema>;

interface JobDetail {
  jsonLd: JobPostingLd;
  applyUrl: string | undefined;
}

interface GetInItRawItem {
  listing: JobListing;
  detail: JobDetail;
}

// Fixed career field IDs from get-in-it.de
const THEMATIC_PRIORITIES: ReadonlyArray<{ id: number; aliases: readonly string[] }> = [
  {
    id: 36,
    aliases: [
      'anwendungsentwicklung',
      'softwareentwicklung',
      'software developer',
      'softwareentwickler',
      'entwickler',
      'developer',
      'programmierer',
      'programmer',
      'java',
      'backend',
      'back-end',
      'frontend',
      'front-end',
      'full stack',
      'fullstack',
      'mobile developer',
      'app developer',
      'android',
      'ios',
    ],
  },
  {
    id: 38,
    aliases: [
      'business analysis',
      'business analyst',
      'requirements engineer',
      'requirements engineering',
      'fachkonzepter',
    ],
  },
  { id: 37, aliases: ['consulting', 'consultant', 'berater', 'beratung', 'it-consultant'] },
  {
    id: 39,
    aliases: [
      'datenbankentwicklung',
      'datenbank',
      'database',
      'business intelligence',
      'data engineer',
      'data engineering',
      'data warehouse',
      'etl',
      'data scientist',
      'data science',
      'big data',
      'data analyst',
    ],
  },
  { id: 45, aliases: ['embedded', 'embedded systems', 'firmware', 'mikrocontroller', 'microcontroller', 'iot'] },
  { id: 44, aliases: ['forschung', 'research', 'wissenschaftlich', 'promotion'] },
  {
    id: 51,
    aliases: [
      'it-security',
      'security',
      'sicherheit',
      'penetration testing',
      'pentest',
      'cyber security',
      'informationssicherheit',
    ],
  },
  { id: 41, aliases: ['produktmanagement', 'product manager', 'product owner', 'produktmanager'] },
  { id: 3, aliases: ['projektmanagement', 'projektmanager', 'project manager', 'scrum master', 'agile coach'] },
  { id: 24, aliases: ['quality assurance', 'testmanager', 'testing', 'test engineer', 'tester', 'qualitätssicherung'] },
  { id: 40, aliases: ['risk management', 'compliance', 'risikomanagement', 'audit'] },
  {
    id: 35,
    aliases: [
      'system engineering',
      'systemadministrator',
      'sysadmin',
      'administrator',
      'devops',
      'cloud engineer',
      'infrastruktur',
      'netzwerk',
      'network engineer',
      'it-administration',
    ],
  },
  { id: 47, aliases: ['ux', 'ui', 'ux/ui', 'user experience', 'user interface', 'designer', 'usability'] },
  {
    id: 5,
    aliases: [
      'webentwicklung',
      'web developer',
      'webdeveloper',
      'frontend developer',
      'javascript',
      'typescript',
      'react',
      'angular',
      'vue',
      'web design',
    ],
  },
];

const EMPLOYMENT_TYPE_BY_TITLE_HINT: ReadonlyArray<readonly [string, EmploymentType]> = [
  ['werkstudent', 'working_student'],
  ['praktikum', 'internship'],
  ['praktikant', 'internship'],
  ['minijob', 'minijob'],
  ['freiberuflich', 'freelance'],
  ['freelance', 'freelance'],
];

const EMPLOYMENT_TYPE_BY_SCHEMA: Partial<Record<string, EmploymentType>> = {
  PART_TIME: 'part_time',
  FULL_TIME: 'full_time',
  INTERN: 'internship',
};

// Limited set of entities that occur in get-in-it's JSON-LD descriptions (no HTML,
// only named entities – see extractDescription).
const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&auml;': 'ä',
  '&ouml;': 'ö',
  '&uuml;': 'ü',
  '&Auml;': 'Ä',
  '&Ouml;': 'Ö',
  '&Uuml;': 'Ü',
  '&szlig;': 'ß',
  '&nbsp;': ' ',
  '&hellip;': '…',
  '&ndash;': '–',
  '&mdash;': '—',
  '&quot;': '"',
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
};

export class GetInItConnector extends BaseConnector<GetInItRawItem> {
  private static readonly BASE_URL = 'https://www.get-in-it.de';
  private static readonly SEARCH_PAGE_SIZE = 100;
  private static readonly MAX_SEARCH_RESULTS = 1000;
  private static readonly DETAIL_REQUEST_DELAY_MS = 500;

  readonly id = 'get-in-it';
  readonly userAgent = 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0';

  protected async fetchRaw(criteria: SearchCriteria, sourceIdLookup?: SourceIdLookup): Promise<GetInItRawItem[]> {
    const thematicPriorityIds = GetInItConnector.matchThematicPriorities(criteria.keywords);
    const listings = await this.searchListings(thematicPriorityIds);

    // When a career field matches, the field is trusted instead of additionally filtering by
    // title substrings – the site is deliberately designed around "career field instead of job
    // title". Without a match, all fields are searched and filtered locally by title.
    const keywordFiltered =
      thematicPriorityIds.length > 0
        ? listings
        : listings.filter((listing) => GetInItConnector.matchesKeywords(listing, criteria));

    const locationFiltered = keywordFiltered
      .filter((listing) => GetInItConnector.matchesLocation(listing, criteria))
      .filter((listing) => GetInItConnector.matchesRemote(listing, criteria));

    // Skip the per-listing detail request for postings already known from a previous run
    const known = await sourceIdLookup?.(locationFiltered.map((listing) => String(listing.id)));
    const items: GetInItRawItem[] = [];
    let isFirstDetailRequest = true;
    for (const listing of locationFiltered) {
      if (known?.has(String(listing.id))) {
        continue;
      }
      if (!isFirstDetailRequest) {
        await GetInItConnector.delay(GetInItConnector.DETAIL_REQUEST_DELAY_MS);
      }
      isFirstDetailRequest = false;
      const detail = await this.fetchJobDetail(listing.id);
      if (!detail) {
        continue;
      }
      const employmentType = GetInItConnector.mapEmploymentType(listing.title ?? '', detail.jsonLd.employmentType);
      if (!GetInItConnector.matchesEmploymentType(employmentType, criteria)) {
        continue;
      }
      items.push({ listing, detail });
    }
    return items;
  }

  protected mapResult({ listing, detail }: GetInItRawItem): ConnectorResult | undefined {
    const candidate = {
      title: listing.title ?? detail.jsonLd.title,
      company: listing.company?.title,
      location: GetInItConnector.formatLocation(listing.locations),
      remote: listing.homeOffice,
      description: GetInItConnector.decodeEntities(detail.jsonLd.description ?? ''),
      url: detail.applyUrl ?? GetInItConnector.buildJobUrl(listing),
      employmentType: GetInItConnector.mapEmploymentType(listing.title ?? '', detail.jsonLd.employmentType),
      postedAt: detail.jsonLd.datePosted ? new Date(detail.jsonLd.datePosted).toISOString() : undefined,
    };

    const parsed = JobPostingSchema.safeParse(candidate);
    if (!parsed.success) {
      return undefined;
    }

    return {
      sourceId: String(listing.id),
      posting: parsed.data,
      rawHtml: JSON.stringify({ listing, detail }),
    };
  }

  private async searchListings(thematicPriorityIds: number[]): Promise<JobListing[]> {
    const listings: JobListing[] = [];
    let start = 0;

    while (start < GetInItConnector.MAX_SEARCH_RESULTS) {
      const url = GetInItConnector.buildSearchApiUrl(thematicPriorityIds, start, GetInItConnector.SEARCH_PAGE_SIZE);
      console.log(`[${new Date().toISOString()}] [${this.id}] Search request: ${url}`);

      const response = await fetch(url, {
        headers: { 'User-Agent': this.userAgent, 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (!response.ok) {
        throw new Error(`get-in-it search failed (${response.status}): ${await response.text()}`);
      }

      const parsed = SearchApiResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        throw new Error(`get-in-it search: unexpected response format: ${parsed.error.message}`);
      }

      const page = parsed.data.items.results;
      listings.push(...page);
      start += GetInItConnector.SEARCH_PAGE_SIZE;
      if (page.length < GetInItConnector.SEARCH_PAGE_SIZE || start >= parsed.data.total) {
        break;
      }
    }

    return listings;
  }

  private async fetchJobDetail(id: number): Promise<JobDetail | undefined> {
    const url = `${GetInItConnector.BASE_URL}/jobsuche/p${id}`;
    console.log(`[${new Date().toISOString()}] [${this.id}] Detail request: ${url}`);

    const response = await fetch(url, { headers: { 'User-Agent': this.userAgent } });
    if (!response.ok) {
      // A single detail request can fail (e.g. posting removed in the meantime)
      return undefined;
    }

    const nextData = GetInItConnector.extractNextData(await response.text());
    const parsed = JobDetailNextDataSchema.safeParse(nextData);
    if (!parsed.success) {
      return undefined;
    }

    const job = parsed.data.props.initialState.jobJob.job;
    const jsonLdMeta = job.metaData.find((entry) => entry.type === 'json_ld');
    if (!jsonLdMeta) {
      return undefined;
    }

    let jsonLdRaw: unknown;
    try {
      jsonLdRaw = JSON.parse(jsonLdMeta.content);
    } catch {
      return undefined;
    }

    const parsedLd = JobPostingLdSchema.safeParse(jsonLdRaw);
    if (!parsedLd.success) {
      return undefined;
    }

    return { jsonLd: parsedLd.data, applyUrl: job.header?.applyUrl };
  }

  private static buildSearchApiUrl(thematicPriorityIds: number[], start: number, limit: number): URL {
    const url = new URL(`${GetInItConnector.BASE_URL}/api/v2/open/job/search`);
    for (const id of thematicPriorityIds) {
      url.searchParams.append('filter[thematic_priority][]', String(id));
    }
    url.searchParams.set('start', String(start));
    url.searchParams.set('limit', String(limit));
    return url;
  }

  private static buildJobUrl(listing: JobListing): string {
    if (listing.url) {
      return listing.url.startsWith('http') ? listing.url : `${GetInItConnector.BASE_URL}${listing.url}`;
    }
    return `${GetInItConnector.BASE_URL}/jobsuche/p${listing.id}`;
  }

  private static matchThematicPriorities(keywords: string[]): number[] {
    const normalizedKeywords = keywords.map((keyword) => GetInItConnector.normalize(keyword));
    const matched = THEMATIC_PRIORITIES.filter(({ aliases }) =>
      normalizedKeywords.some((keyword) =>
        aliases.some((alias) => GetInItConnector.matchesAlias(keyword, GetInItConnector.normalize(alias))),
      ),
    );
    return matched.map(({ id }) => id);
  }

  private static matchesAlias(keyword: string, alias: string): boolean {
    if (keyword === alias) {
      return true;
    }
    // Only match short terms exactly, to avoid random substring hits (e.g. "ui").
    if (Math.min(keyword.length, alias.length) < 3) {
      return false;
    }
    return keyword.includes(alias) || alias.includes(keyword);
  }

  private static matchesKeywords(listing: JobListing, criteria: SearchCriteria): boolean {
    if (criteria.keywords.length === 0) {
      return true;
    }
    const haystack = GetInItConnector.normalize(listing.title ?? '');
    return criteria.keywords.some((keyword) => haystack.includes(GetInItConnector.normalize(keyword)));
  }

  private static matchesLocation(listing: JobListing, criteria: SearchCriteria): boolean {
    if (!criteria.location) {
      return true;
    }
    const normCriteria = GetInItConnector.normalize(criteria.location);
    return (listing.locations ?? []).some((location) =>
      GetInItConnector.normalize(location.name).includes(normCriteria),
    );
  }

  private static matchesRemote(listing: JobListing, criteria: SearchCriteria): boolean {
    if (criteria.remote !== true) {
      return true;
    }
    return listing.homeOffice === true;
  }

  private static matchesEmploymentType(employmentType: EmploymentType | undefined, criteria: SearchCriteria): boolean {
    if (!criteria.employmentTypes || criteria.employmentTypes.length === 0) {
      return true;
    }
    return employmentType !== undefined && criteria.employmentTypes.includes(employmentType);
  }

  /**
   * `employmentType` from the JSON-LD is unreliable (e.g. it's usually FULL_TIME even for
   * "Werkstudent" titles) – title hints therefore take priority, the schema serves as a
   * fallback for the vz/tz distinction, and `full_time` is the final fallback (the vast
   * majority of get-in-it postings without a title hint are regular full-time positions).
   */
  private static mapEmploymentType(title: string, schemaType: string | undefined): EmploymentType {
    const normalizedTitle = GetInItConnector.normalize(title);
    for (const [hint, type] of EMPLOYMENT_TYPE_BY_TITLE_HINT) {
      if (normalizedTitle.includes(hint)) {
        return type;
      }
    }
    return (schemaType ? EMPLOYMENT_TYPE_BY_SCHEMA[schemaType] : undefined) ?? 'full_time';
  }

  private static formatLocation(locations: JobListing['locations']): string | undefined {
    if (!locations || locations.length === 0) {
      return undefined;
    }
    const [, ...rest] = locations;
    const label = locations[0]?.name;
    return rest.length > 0 ? `${label} (+${rest.length} weitere)` : label;
  }

  private static decodeEntities(text: string): string {
    return text.replace(/&[a-zA-Z]+;/g, (entity) => HTML_ENTITIES[entity] ?? entity).trim();
  }

  private static normalize(text: string): string {
    return text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private static extractNextData(html: string): unknown {
    const match = /<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s.exec(html);
    const json = match?.[1];
    if (!json) {
      throw new Error('get-in-it search: __NEXT_DATA__ not found – page structure has likely changed.');
    }
    return JSON.parse(json);
  }
}
