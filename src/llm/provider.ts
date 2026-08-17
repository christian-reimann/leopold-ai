import { createAnthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const chatModel: LanguageModel = anthropic('claude-haiku-4-5');
