import { generateText, Output } from 'ai';
import { ProfileSchema, type Profile } from '@/shared/schemas/profile';
import { chatModel } from './provider';

/**
 * Reine strukturierte Extraktion (kein RAG, siehe MORTIMER-PROJEKTPLAN.md §6):
 * der gesamte Dokumenttext geht als Prompt-Kontext direkt ins LLM.
 */
export async function extractProfile(documentText: string): Promise<Profile> {
  const { output } = await generateText({
    model: chatModel,
    output: Output.object({ schema: ProfileSchema }),
    prompt: `Extrahiere die Profildaten (Name, Rolle, Adresse, Kontakt, Ausbildung, Berufserfahrung, Projekte, Skills, Stärken, Sprachen, Interessen) aus folgendem Lebenslauf-Text. Gib nur Informationen zurück, die im Text tatsächlich vorkommen.

Für Start- und Enddaten von Ausbildung, Berufserfahrung und Projekten gilt: Gib das Format als "MM.YYYY" zurück (z. B. "03.2025"), wenn im Text ein Monat bekannt ist. Ist im Text nur ein einzelnes Jahr ohne Monat angegeben (z. B. "2025" statt einem Zeitraum wie "2023–2025" oder "03/2025"), setze sowohl startDate als auch endDate auf dieses Jahr im Format "YYYY" (z. B. "2025"). Lasse endDate in diesem Fall nicht leer, da ein leeres endDate bedeutet, dass die Tätigkeit noch andauert.

${documentText}`,
  });

  return output;
}
