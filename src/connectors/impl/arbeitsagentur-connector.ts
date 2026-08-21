import { z } from 'zod';
import type { EmploymentType } from '@/shared/schemas/job-posting';
import { JobPostingSchema } from '@/shared/schemas/job-posting';
import type { SearchCriteria } from '@/shared/schemas/search-query';
import { BaseConnector } from '../base-connector';
import type { ConnectorResult, SourceIdLookup } from '../connector';

/**
 * Unofficial interface of the Bundesagentur für Arbeit – the BA does not offer an
 * official API for this. Auth uses a publicly known, fixed client key.
 */
const AdresseSchema = z.object({
  plz: z.string().optional(),
  ort: z.string().optional(),
});

const StellenlokationSchema = z.object({
  adresse: AdresseSchema.optional(),
});

const SearchHitSchema = z.object({
  referenznummer: z.string(),
  stellenangebotsTitel: z.string().optional(),
  hauptberuf: z.string().optional(),
  firma: z.string().optional(),
  externeURL: z.string().optional(),
  stellenlokationen: z.array(StellenlokationSchema).optional(),
});
type SearchHit = z.infer<typeof SearchHitSchema>;

const SearchResponseSchema = z.object({
  // Missing entirely (instead of an empty array) when `page` is beyond the last page.
  ergebnisliste: z.array(SearchHitSchema).optional().default([]),
  maxErgebnisse: z.number(),
});
type SearchResponse = z.infer<typeof SearchResponseSchema>;

const JobDetailsSchema = z.object({
  referenznummer: z.string().optional(),
  stellenangebotsTitel: z.string().optional(),
  stellenangebotsBeschreibung: z.string().optional(),
  hauptberuf: z.string().optional(),
  firma: z.string().optional(),
  externeURL: z.string().optional(),
  stellenlokationen: z.array(StellenlokationSchema).optional(),
  arbeitszeitVollzeit: z.boolean().optional(),
  arbeitszeitTeilzeitAbend: z.boolean().optional(),
  arbeitszeitTeilzeitNachmittag: z.boolean().optional(),
  arbeitszeitTeilzeitVormittag: z.boolean().optional(),
  arbeitszeitTeilzeitFlexibel: z.boolean().optional(),
  istGeringfuegigeBeschaeftigung: z.boolean().optional(),
  homeofficemoeglich: z.boolean().optional(),
  stellenangebotsart: z.string().optional(),
  datumErsteVeroeffentlichung: z.string().optional(),
  veroeffentlichungszeitraum: z.object({ von: z.string().optional() }).optional(),
});
type JobDetails = z.infer<typeof JobDetailsSchema>;

interface ArbeitsagenturRawItem {
  hit: SearchHit;
  details: JobDetails;
}

export class ArbeitsagenturConnector extends BaseConnector<ArbeitsagenturRawItem> {
  private static readonly BASE_URL = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service';
  private static readonly API_KEY = 'jobboerse-jobsuche';
  private static readonly PAGE_SIZE = 25;
  private static readonly PUBLISHED_WITHIN_DAYS = 28;
  private static readonly DETAIL_REQUEST_DELAY_MS = 500;

  private static readonly ARBEITSZEIT_BY_EMPLOYMENT_TYPE: Partial<Record<string, string>> = {
    full_time: 'vz',
    part_time: 'tz',
    minijob: 'mj',
  };

  private static readonly ANGEBOTSART_BY_EMPLOYMENT_TYPE: Partial<Record<string, string>> = {
    full_time: '1',
    part_time: '1',
    minijob: '1',
    working_student: '34',
    internship: '34',
    freelance: '2',
  };

  readonly id = 'arbeitsagentur';
  readonly userAgent = 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0';

  protected async fetchRaw(
    criteria: SearchCriteria,
    sourceIdLookup?: SourceIdLookup,
  ): Promise<ArbeitsagenturRawItem[]> {
    const hits = await this.searchJobs(criteria);

    // Skip the per-hit detail request for postings already known from a previous run
    const known = await sourceIdLookup?.(hits.map((hit) => hit.referenznummer));
    const items: ArbeitsagenturRawItem[] = [];
    let isFirstDetailRequest = true;
    for (const hit of hits) {
      if (known?.has(hit.referenznummer)) {
        continue;
      }
      if (!isFirstDetailRequest) {
        await ArbeitsagenturConnector.delay(ArbeitsagenturConnector.DETAIL_REQUEST_DELAY_MS);
      }
      isFirstDetailRequest = false;
      const details = await this.fetchJobDetails(hit.referenznummer);
      if (details) {
        items.push({ hit, details });
      }
    }
    return items;
  }

  protected mapResult({ hit, details }: ArbeitsagenturRawItem): ConnectorResult | undefined {
    return ArbeitsagenturConnector.buildConnectorResult(hit, details);
  }

  // Uses this.userAgent -> instance method, can't be static.
  private headers(): HeadersInit {
    return { 'X-API-Key': ArbeitsagenturConnector.API_KEY, 'User-Agent': this.userAgent };
  }

  // Fetches all pages until `maxErgebnisse` is reached or a page comes back empty
  // (beyond the last page, the API no longer returns an `ergebnisliste` field).
  private async searchJobs(criteria: SearchCriteria): Promise<SearchHit[]> {
    const hits: SearchHit[] = [];
    let page = 1;
    let total = Number.POSITIVE_INFINITY;
    while (hits.length < total) {
      const response = await this.fetchSearchPage(criteria, page);
      if (response.ergebnisliste.length === 0) {
        break;
      }
      hits.push(...response.ergebnisliste);
      total = response.maxErgebnisse;
      page++;
    }
    return hits;
  }

  private async fetchSearchPage(criteria: SearchCriteria, page: number): Promise<SearchResponse> {
    const params = ArbeitsagenturConnector.buildSearchParams(criteria, page);
    const url = `${ArbeitsagenturConnector.BASE_URL}/pc/v6/jobs?${ArbeitsagenturConnector.toQueryString(params)}`;
    console.log(`[${new Date().toISOString()}] [${this.id}] Search request: ${url}`);

    const response = await fetch(url, {
      headers: this.headers(),
    });
    if (!response.ok) {
      throw new Error(`Arbeitsagentur job search failed (${response.status}): ${await response.text()}`);
    }

    const parsed = SearchResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new Error(`Arbeitsagentur job search: unexpected response format: ${parsed.error.message}`);
    }
    return parsed.data;
  }

  private async fetchJobDetails(refnr: string): Promise<JobDetails | undefined> {
    const encoded = Buffer.from(refnr).toString('base64');
    const response = await fetch(`${ArbeitsagenturConnector.BASE_URL}/pc/v4/jobdetails/${encoded}`, {
      headers: this.headers(),
    });
    if (!response.ok) {
      // A single detail request can fail (e.g. posting removed in the meantime) –
      // that shouldn't abort the whole search, see fetchRaw.
      return undefined;
    }
    const parsed = JobDetailsSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : undefined;
  }

  /**
   * `URLSearchParams.toString()` encodes spaces as "+" (application/x-www-form-urlencoded),
   * but the Arbeitsagentur API only returns correct results with "%20"
   */
  private static toQueryString(params: URLSearchParams): string {
    return [...params.entries()]
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }

  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Doesn't use any member variables -> static.
  private static buildSearchParams(criteria: SearchCriteria, page: number): URLSearchParams {
    const params = new URLSearchParams();
    if (criteria.keywords.length > 0) {
      params.set('was', criteria.keywords.join(' '));
    }
    if (criteria.location) {
      params.set('wo', criteria.location);
    }
    if (criteria.radiusKm !== undefined) {
      params.set('umkreis', String(criteria.radiusKm));
    }
    if (criteria.remote) {
      params.set('homeoffice', 'prozentual_0;nv_true');
    }

    const arbeitszeit = new Set<string>();
    for (const type of criteria.employmentTypes ?? []) {
      const mapped = ArbeitsagenturConnector.ARBEITSZEIT_BY_EMPLOYMENT_TYPE[type];
      if (mapped) {
        arbeitszeit.add(mapped);
      }
    }
    if (arbeitszeit.size > 0) {
      params.set('arbeitszeit', [...arbeitszeit].join(';'));
    }

    // Only one value possible: the first hit from the requested employmentTypes wins.
    const angebotsart =
      (criteria.employmentTypes ?? [])
        .map((type) => ArbeitsagenturConnector.ANGEBOTSART_BY_EMPLOYMENT_TYPE[type])
        .find((value) => value !== undefined) ?? '1';

    params.set('angebotsart', angebotsart);
    params.set('veroeffentlichtseit', String(ArbeitsagenturConnector.PUBLISHED_WITHIN_DAYS));
    params.set('page', String(page));
    params.set('size', String(ArbeitsagenturConnector.PAGE_SIZE));
    params.set('pav', 'false');
    params.set('as', 'true');
    params.set('sort', 'veroeffdatum');
    return params;
  }

  private static buildPublicUrl(searchHit: SearchHit, details: JobDetails, refnr: string): string {
    return details.externeURL ?? searchHit.externeURL ?? `https://www.arbeitsagentur.de/jobsuche/jobdetail/${refnr}`;
  }

  private static formatLocation(details: JobDetails): string | undefined {
    const [first, ...rest] = details.stellenlokationen ?? [];
    const ort = first?.adresse?.ort;
    if (!ort) {
      return undefined;
    }
    const label = first.adresse?.plz ? `${first.adresse.plz} ${ort}` : ort;
    return rest.length > 0 ? `${label} (+${rest.length} weitere)` : label;
  }

  private static mapEmploymentType(details: JobDetails): EmploymentType | undefined {
    if (details.stellenangebotsart === 'SELBSTAENDIGKEIT') return 'freelance';
    if (details.stellenangebotsart === 'PRAKTIKUM_TRAINEE') return 'internship';

    if (details.istGeringfuegigeBeschaeftigung) return 'minijob';
    if (
      details.arbeitszeitTeilzeitAbend ||
      details.arbeitszeitTeilzeitNachmittag ||
      details.arbeitszeitTeilzeitVormittag ||
      details.arbeitszeitTeilzeitFlexibel
    ) {
      return 'part_time';
    }
    //if (details.arbeitszeitVollzeit) return 'full_time';
    return 'full_time';
  }

  private static toIsoDateTime(date: string | undefined): string | undefined {
    if (!date) {
      return undefined;
    }
    return date.includes('T') ? date : `${date}T00:00:00.000Z`;
  }

  /**
   * Builds a ConnectorResult from search hit + detail response. Returns `undefined` when
   * required fields (title/company) are missing – such a case is skipped instead of aborting
   * the whole search (see mapResult).
   */
  private static buildConnectorResult(searchHit: SearchHit, details: JobDetails): ConnectorResult | undefined {
    const refnr = details.referenznummer ?? searchHit.referenznummer;
    const title = details.stellenangebotsTitel ?? details.hauptberuf ?? searchHit.stellenangebotsTitel;
    const company = details.firma ?? searchHit.firma;
    if (!title || !company) {
      return undefined;
    }

    const candidate = {
      title,
      company,
      location: ArbeitsagenturConnector.formatLocation(details),
      remote: details.homeofficemoeglich ?? false,
      description: details.stellenangebotsBeschreibung ?? '',
      url: ArbeitsagenturConnector.buildPublicUrl(searchHit, details, refnr),
      employmentType: ArbeitsagenturConnector.mapEmploymentType(details),
      postedAt: ArbeitsagenturConnector.toIsoDateTime(
        details.datumErsteVeroeffentlichung ?? details.veroeffentlichungszeitraum?.von,
      ),
    };

    const parsed = JobPostingSchema.safeParse(candidate);
    if (!parsed.success) {
      return undefined;
    }

    return {
      sourceId: refnr,
      posting: parsed.data,
      rawHtml: JSON.stringify(details),
    };
  }
}
