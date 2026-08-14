import { generateText, Output, type LanguageModel } from 'ai';
import { ProfileSchema, type Profile } from '@/shared/schemas/profile';
import { chatModel } from './provider';

export class ProfileExtractor {
  constructor(private readonly model: LanguageModel = chatModel) {}

  /**
   * Pure structured extraction (no RAG, see LEOPOLD-PROJEKTPLAN.md §6):
   * The entire document text goes directly into the LLM as prompt context.
   */
  async extractProfile(documentText: string): Promise<Profile> {
    const context = `Profil-Extraktion (${documentText.length} Zeichen Dokumenttext)`;
    console.log(`[${new Date().toISOString()}] [llm:profile-extraction] Started: ${context}`);
    const start = Date.now();

    const { output } = await generateText({
      model: this.model,
      output: Output.object({ schema: ProfileSchema }),
      prompt: `Extrahiere die Profildaten (Name, Rolle, Adresse, Kontakt, Ausbildung, Berufserfahrung, Projekte, Skills, Stärken, Sprachen, Interessen) aus folgendem Lebenslauf-Text. Gib nur Informationen zurück, die im Text tatsächlich vorkommen.

        Für Start- und Enddaten von Ausbildung, Berufserfahrung und Projekten gilt: Gib das Format als "MM.YYYY" zurück (z. B. "03.2025"), wenn im Text ein Monat bekannt ist. Ist im Text nur ein einzelnes Jahr ohne Monat angegeben (z. B. "2025" statt einem Zeitraum wie "2023–2025" oder "03/2025"), setze sowohl startDate als auch endDate auf dieses Jahr im Format "YYYY" (z. B. "2025"). Lasse endDate in diesem Fall nicht leer, da ein leeres endDate bedeutet, dass die Tätigkeit noch andauert.

        ${documentText}`,
    });

    console.log(
      `[${new Date().toISOString()}] [llm:profile-extraction] Completed: ${context} → "${output.personal.name}" (${Date.now() - start}ms)`,
    );
    return output;
  }
}

export const profileExtractor = new ProfileExtractor();
