import { z } from 'zod';
import type { EmploymentType } from '@/shared/schemas/job-posting';
import { JobPostingSchema } from '@/shared/schemas/job-posting';
import type { SearchCriteria } from '@/shared/schemas/search-query';
import { BaseConnector } from '../base-connector';
import type { ConnectorResult } from '../connector';

/**
 * Inoffizielle Schnittstelle der Bundesagentur für Arbeit – die BA bietet dafür keine
 * offizielle API an. Auth über einen öffentlich bekannten, festen Client-Key.
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
  ergebnisliste: z.array(SearchHitSchema),
});

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

  private static readonly ARBEITSZEIT_BY_EMPLOYMENT_TYPE: Partial<Record<string, string>> = {
    full_time: 'vz',
    part_time: 'tz',
    working_student: 'tz',
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
  readonly userAgent = 'LeopoldAI-Jobpilot/1.3';

  protected async fetchRaw(criteria: SearchCriteria): Promise<ArbeitsagenturRawItem[]> {
    const hits = await this.searchJobs(criteria);

    // Die Suchantwort enthält keine Beschreibung – pro Treffer ein Detail-Request nötig.
    // Sequenziell statt parallel, um die inoffizielle API nicht zu überlasten.
    const items: ArbeitsagenturRawItem[] = [];
    for (const hit of hits) {
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

  // Nutzt this.userAgent -> Instanzmethode, kann nicht statisch sein.
  private headers(): HeadersInit {
    return { 'X-API-Key': ArbeitsagenturConnector.API_KEY, 'User-Agent': this.userAgent };
  }

  private async searchJobs(criteria: SearchCriteria, page = 1): Promise<SearchHit[]> {
    const params = ArbeitsagenturConnector.buildSearchParams(criteria, page);
    const url = `${ArbeitsagenturConnector.BASE_URL}/pc/v6/jobs?${params.toString()}`;
    console.log(`[${new Date().toISOString()}] [${this.id}] Suchanfrage: ${url}`);

    const response = await fetch(url, {
      headers: this.headers(),
    });
    if (!response.ok) {
      throw new Error(`Arbeitsagentur-Jobsuche fehlgeschlagen (${response.status}): ${await response.text()}`);
    }

    const parsed = SearchResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new Error(`Arbeitsagentur-Jobsuche: unerwartetes Antwortformat: ${parsed.error.message}`);
    }
    return parsed.data.ergebnisliste;
  }

  private async fetchJobDetails(refnr: string): Promise<JobDetails | undefined> {
    const encoded = Buffer.from(refnr).toString('base64');
    const response = await fetch(`${ArbeitsagenturConnector.BASE_URL}/pc/v4/jobdetails/${encoded}`, {
      headers: this.headers(),
    });
    if (!response.ok) {
      // Einzelne Detailanfrage kann fehlschlagen (z.B. Stelle zwischenzeitlich entfernt) –
      // das soll nicht die ganze Suche abbrechen, siehe fetchRaw.
      return undefined;
    }

    const parsed = JobDetailsSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : undefined;
  }

  // Nutzt keine Membervariablen -> statisch.
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
      params.set('homeoffice', 'nv_true');
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

    // Nur ein Wert möglich: erster Treffer aus den angeforderten employmentTypes gewinnt.
    // Ohne spezifischere Anforderung greift der Standard "1" (ARBEIT) – filtert Ausbildung,
    // Praktikum/Werkstudent und Selbstständigkeit standardmäßig heraus.
    const angebotsart =
      (criteria.employmentTypes ?? [])
        .map((type) => ArbeitsagenturConnector.ANGEBOTSART_BY_EMPLOYMENT_TYPE[type])
        .find((value) => value !== undefined) ?? '1';

    params.set('angebotsart', angebotsart);
    params.set('pav', 'false');
    params.set('as', 'true');
    params.set('page', String(page));
    params.set('size', String(ArbeitsagenturConnector.PAGE_SIZE));
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

  /**
   * `stellenangebotsart` ist spezifischer als die arbeitszeit*-Flags (z.B. SELBSTAENDIGKEIT/
   * PRAKTIKUM_TRAINEE) und hat daher Priorität. AUSBILDUNG hat aktuell keine passende
   * EmploymentType-Entsprechung und wird bewusst nicht gemappt.
   */
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
    if (details.arbeitszeitVollzeit) return 'full_time';
    return undefined;
  }

  private static toIsoDateTime(date: string | undefined): string | undefined {
    if (!date) {
      return undefined;
    }
    return date.includes('T') ? date : `${date}T00:00:00.000Z`;
  }

  /**
   * Baut ein ConnectorResult aus Suchtreffer + Detail-Antwort. Gibt `undefined` zurück, wenn
   * Pflichtfelder (title/company) fehlen – so ein Fall wird übersprungen statt die ganze Suche
   * abzubrechen (siehe mapResult).
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
