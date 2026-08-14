import { createAnthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// The only place that knows the concrete provider: extractors/transcribers depend
// only on the AI SDK's provider-agnostic `LanguageModel` type, not on Anthropic.
export const chatModel: LanguageModel = anthropic('claude-haiku-4-5');
