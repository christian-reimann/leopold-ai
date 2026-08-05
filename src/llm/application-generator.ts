import { generateText, type LanguageModel } from 'ai';
import type { ApplicationLanguage, ApplicationTone, PersonalityTrait } from '@/shared/schemas/application';
import type { JobPosting } from '@/shared/schemas/job-posting';
import type { Profile } from '@/shared/schemas/profile';
import { chatModel } from './provider';

const TONE_LABELS: Record<ApplicationTone, string> = {
  formal: 'formell und klassisch, sehr korrekt, Sie-Form, wenig Emotion',
  neutral: 'sachlich-neutral, professionell, aber nicht steif',
  confident: 'selbstbewusst, klare aktive Sprache, betont Stärken/Erfolge offensiv',
  creative: 'kreativ und locker, auflockernder Schreibstil',
};

const PERSONALITY_LABELS: Record<PersonalityTrait, string> = {
  analytical: 'analytisch/strukturiert (faktenbasiert, präzise)',
  creative: 'kreativ/visionär (denkt in Möglichkeiten)',
  team_oriented: 'teamorientiert (betont Zusammenarbeit)',
  results_oriented: 'ergebnisorientiert/pragmatisch (konkrete Erfolge, Zahlen)',
  empathetic: 'empathisch/kommunikativ (zwischenmenschliche Stärken)',
  down_to_earth: 'bodenständig/zuverlässig (Kontinuität, Verlässlichkeit)',
};

const LANGUAGE_LABELS: Record<ApplicationLanguage, string> = {
  de: 'Deutsch',
  en: 'Englisch',
};

const ALLOWED_HTML_HINT =
  'Gib valides, einfaches HTML zurück (nur die Tags p, ul, li, strong, em, h3 verwenden, keine Inline-Styles, kein <html>/<body>-Wrapper, kein Markdown, keine Code-Fences).';

export type ApplicationGenerationInput = {
  profile: Profile;
  job: JobPosting;
  ragChunks: string[];
  tone: ApplicationTone;
  personality: PersonalityTrait[];
  language: ApplicationLanguage;
  instructions?: string;
};

export class ApplicationGenerator {
  constructor(private readonly model: LanguageModel = chatModel) {}

  async generateLetter(input: ApplicationGenerationInput): Promise<string> {
    const { text } = await generateText({
      model: this.model,
      prompt: `Erstelle ein individuelles Anschreiben für die folgende Bewerbung, als eigenständiges Dokument – kein Lebenslauf, keine tabellarische Auflistung, sondern ein persönlich adressierter Fließtext an das Unternehmen.

      ${this.sharedInstructions(input)}

      Struktur: Anrede, Einstieg mit Bezug zur Stelle, 2-3 Absätze zur Passung (Erfahrung/Skills zu den Anforderungen), Abschluss mit Gesprächswunsch und Grußformel.

      ${this.sharedContext(input)}`,
    });

    return text.trim();
  }

  async generateCv(input: ApplicationGenerationInput): Promise<string> {
    const { text } = await generateText({
      model: this.model,
      prompt: `Erstelle einen auf die Stelle zugeschnittenen Lebenslauf für die folgende Bewerbung, als eigenständiges Dokument – kein Anschreiben, sondern eine strukturierte, tabellarische Übersicht.

      ${this.sharedInstructions(input)}

      Struktur: Abschnitte mit h3-Überschriften (z.B. Berufserfahrung, Ausbildung, Skills, Sprachen), darunter jeweils knappe Stichpunkte (ul/li). Kein Anschreibentext, keine Anrede.

      ${this.sharedContext(input)}`,
    });

    return text.trim();
  }

  private sharedInstructions(input: ApplicationGenerationInput): string {
    const personalityText =
      input.personality.length > 0
        ? input.personality.map((trait) => PERSONALITY_LABELS[trait]).join('; ')
        : 'keine besonderen Vorgaben';

    return `Sprache: ${LANGUAGE_LABELS[input.language]}
      Tonalität: ${TONE_LABELS[input.tone]}
      Persönlichkeit: ${personalityText}
      ${ALLOWED_HTML_HINT}
      ${input.instructions ? `Zusätzliche Anweisung: ${input.instructions}` : ''}`;
  }

  private sharedContext(input: ApplicationGenerationInput): string {
    return `Stellenanzeige:
      Titel: ${input.job.title}
      Unternehmen: ${input.job.company}
      Beschreibung:
      ${input.job.description}

      Profil:
      Name: ${input.profile.personal.name}
      Rolle: ${input.profile.personal.role}
      Skills: ${input.profile.skills.flatMap((category) => category.skills).join(', ')}
      Berufserfahrung:
      ${input.profile.experiences.map((experience) => `- ${experience.role} bei ${experience.company ?? 'unbekannt'} (${experience.startDate}–${experience.endDate ?? 'heute'}): ${experience.description}`).join('\n')}
      Ausbildung:
      ${input.profile.education.map((entry) => `- ${entry.degree}, ${entry.institution}`).join('\n')}

      Relevante Ausschnitte aus Lebenslauf/Zertifikaten (als zusätzlicher Kontext, ggf. für Formulierungen/Details nutzen):
      ${input.ragChunks.length > 0 ? input.ragChunks.map((chunk) => `---\n${chunk}`).join('\n') : 'keine gefunden'}`;
  }
}

export const applicationGenerator = new ApplicationGenerator();
