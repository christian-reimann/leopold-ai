import { z } from 'zod';
import type { EmploymentType } from '@/shared/schemas/job-posting';
import { JobPostingSchema } from '@/shared/schemas/job-posting';
import type { SearchCriteria } from '@/shared/schemas/search-query';
import { BaseConnector } from '../base-connector';
import type { ConnectorResult } from '../connector';

/**
 * Unofficial connector for kimeta.de. Kimeta does not offer a public API – its robots.txt
 * excludes /search and /api for all bots.
 */
const JobOfferFeaturesSchema = z.object({
  isPaid: z.boolean().optional(),
});

const JobOfferSchema = z.object({
  documentId: z.string(),
  title: z.string().optional(),
  companyName: z.string().optional(),
  location: z.string().optional(),
  offerUrl: z.string().optional(),
  teaser: z.string().optional(),
  firstFound: z.string().optional(),
  employmentType: z.array(z.string()).optional(),
  hours: z.array(z.string()).optional(),
  features: JobOfferFeaturesSchema.optional(),
});
type JobOffer = z.infer<typeof JobOfferSchema>;

const PpaPayloadSchema = z.object({
  searchResults: z.object({
    jobOffers: z.array(JobOfferSchema),
  }),
});

export class KimetaConnector extends BaseConnector<JobOffer> {
  private static readonly BASE_URL = 'https://www.kimeta.de';

  private static readonly BESCHAEFTIGUNGSART_BY_EMPLOYMENT_TYPE: Partial<Record<string, string>> = {
    working_student: 'Student',
    freelance: 'Freiberuflich',
    internship: 'Praktikum',
    minijob: 'Minijob',
  };

  private static readonly ZEITINTENSITAET_BY_EMPLOYMENT_TYPE: Partial<Record<string, string>> = {
    full_time: 'Vollzeit',
    part_time: 'Teilzeit',
  };

  readonly id = 'kimeta';
  readonly userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0';

  protected async fetchRaw(criteria: SearchCriteria): Promise<JobOffer[]> {
    const url = KimetaConnector.buildSearchUrl(criteria);
    console.log(`[${new Date().toISOString()}] [${this.id}] Search request: ${url}`);

    const response = await fetch(url, {
      headers: { 'User-Agent': this.userAgent },
    });
    if (!response.ok) {
      throw new Error(`kimeta search failed (${response.status}): ${await response.text()}`);
    }

    const payload = KimetaConnector.extractPpaPayload(await response.text());
    const parsed = PpaPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(`kimeta search: unexpected response format: ${parsed.error.message}`);
    }
    return parsed.data.searchResults.jobOffers;
  }

  protected mapResult(raw: JobOffer): ConnectorResult | undefined {
    const candidate = {
      title: raw.title,
      company: raw.companyName,
      location: KimetaConnector.normalizeLocation(raw.location),
      description: raw.teaser ?? '',
      url: raw.offerUrl,
      employmentType: KimetaConnector.mapEmploymentType(raw),
      postedAt: raw.firstFound,
    };

    const parsed = JobPostingSchema.safeParse(candidate);
    if (!parsed.success) {
      return undefined;
    }

    return {
      sourceId: raw.documentId,
      posting: parsed.data,
      rawHtml: JSON.stringify(raw),
    };
  }

  // Kimeta sometimes delivers location with embedded tabs/line breaks (e.g. postal code and
  // city separated by multi-line whitespace) – normalize to a single space for display.
  private static normalizeLocation(location: string | undefined): string | undefined {
    const normalized = location?.replace(/\s+/g, ' ').trim();
    return normalized || undefined;
  }

  private static buildSearchUrl(criteria: SearchCriteria): URL {
    const url = new URL(`${KimetaConnector.BASE_URL}/search`);
    if (criteria.keywords.length > 0) {
      url.searchParams.set('q', criteria.keywords.join(' '));
    }
    if (criteria.location) {
      url.searchParams.set('loc', criteria.location);
    }
    if (criteria.radiusKm !== undefined) {
      url.searchParams.set('r', String(criteria.radiusKm));
    }
    if (criteria.remote) {
      url.searchParams.append('pf', 'homeoffice@Einblenden');
    }

    for (const type of criteria.employmentTypes ?? []) {
      const beschaeftigungsart = KimetaConnector.BESCHAEFTIGUNGSART_BY_EMPLOYMENT_TYPE[type];
      if (beschaeftigungsart) {
        url.searchParams.append('pf', `beschäftigungsart@${beschaeftigungsart}`);
      }
      const zeitintensitaet = KimetaConnector.ZEITINTENSITAET_BY_EMPLOYMENT_TYPE[type];
      if (zeitintensitaet) {
        url.searchParams.append('pf', `zeitintensität@${zeitintensitaet}`);
      }
    }

    return url;
  }

  /**
   * `employmentType` is more specific than the hours field (Vollzeit/Teilzeit) and therefore
   * takes priority, analogous to the mapping in ArbeitsagenturConnector.
   */
  private static mapEmploymentType(offer: JobOffer): EmploymentType | undefined {
    const types = offer.employmentType ?? [];
    if (types.includes('Minijob')) return 'minijob';
    if (types.includes('Werkstudent')) return 'working_student';
    if (types.includes('Praktikum')) return 'internship';
    if (types.includes('Freiberuflich')) return 'freelance';

    const hours = offer.hours ?? [];
    if (hours.includes('Teilzeit')) return 'part_time';
    if (hours.includes('Vollzeit')) return 'full_time';
    return undefined;
  }

  /**
   * Kimeta renders search results server-side and embeds them as an array of character codes
   * (instead of regular JSON) in __NEXT_DATA__. String.fromCharCode.apply/spread would blow the
   * argument stack limit at the tens of thousands of elements typical here, so decode
   * element-by-element via map/join instead.
   */
  private static extractPpaPayload(html: string): unknown {
    const match = /<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s.exec(html);
    const nextDataJson = match?.[1];
    if (!nextDataJson) {
      throw new Error('kimeta search: __NEXT_DATA__ not found – page structure has likely changed.');
    }

    const nextData: unknown = JSON.parse(nextDataJson);
    const ppa = (nextData as { props?: { pageProps?: { __PPA__?: unknown } } })?.props?.pageProps?.__PPA__;
    if (!Array.isArray(ppa)) {
      throw new Error('kimeta search: __PPA__ payload not found – page structure has likely changed.');
    }

    const json = (ppa as number[]).map((code) => String.fromCharCode(code)).join('');
    return JSON.parse(json);
  }
}
