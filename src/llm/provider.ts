import { createAnthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Einzige Stelle, die den konkreten Provider kennt: Extractor/Transcriber hängen
// nur vom provider-agnostischen `LanguageModel`-Typ des AI SDK ab, nicht von Anthropic.
export const chatModel: LanguageModel = anthropic('claude-haiku-4-5');
