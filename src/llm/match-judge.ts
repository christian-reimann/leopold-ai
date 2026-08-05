import { generateText, Output, type LanguageModel } from 'ai';
import type { JobPosting } from '@/shared/schemas/job-posting';
import { MatchResultSchema, type MatchResult } from '@/shared/schemas/match';
import type { Profile } from '@/shared/schemas/profile';
import { chatModel } from './provider';

export class MatchJudge {
  constructor(private readonly model: LanguageModel = chatModel) {}

  async judge(profile: Profile, posting: JobPosting): Promise<MatchResult> {
    const { output } = await generateText({
      model: this.model,
      output: Output.object({ schema: MatchResultSchema }),
      prompt: `Schätze ein, wie gut das Profil unten zu den Anforderungen der folgenden Stellenanzeige passt – als Einschätzung der Erfolgschance bei einer Bewerbung.

        scoreMeToJob: 0-100, wobei 100 bedeutet, dass alle erkennbaren Anforderungen erfüllt werden.

        positives: Höchstens 4 Stichpunkte auf Deutsch, die für einen Match sprechen (erfüllte Anforderungen, passende Erfahrung/Skills) – wähle die jeweils relevantesten aus. Jeder Punkt hat ein weight von 1-3 (3 = sehr starkes Argument, 1 = schwaches/nebensächliches Argument).

        negatives: Höchstens 4 Stichpunkte auf Deutsch, die gegen einen Match sprechen (fehlende Anforderungen, Lücken) – wähle die jeweils relevantesten aus. Jeder Punkt hat ein weight von 1-3 (3 = schwerwiegend, 1 = geringfügig).

        Stellenanzeige:
        Titel: ${posting.title}
        Anstellungsart: ${posting.employmentType ?? 'unbekannt'}
        Beschreibung:
        ${posting.description}

        Profil:
        Rolle: ${profile.personal.role}
        Skills: ${profile.skills.flatMap((category) => category.skills).join(', ')}
        Berufserfahrung:
        ${profile.experiences.map((experience) => `- ${experience.role} (${experience.startDate}–${experience.endDate ?? 'heute'}): ${experience.description}`).join('\n')}
        Ausbildung:
        ${profile.education.map((entry) => `- ${entry.degree}, ${entry.institution}`).join('\n')}
        Sprachen: ${profile.languages.map((language) => `${language.language} (${language.level})`).join(', ')}`,
    });

    return output;
  }
}

export const matchJudge = new MatchJudge();
