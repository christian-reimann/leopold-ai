import { describe, expect, it } from 'vitest';
import { ProfileExtractor } from '@/llm/profile-extraction';
import { buildProfile } from '../fixtures/shared';
import { mockStructuredLanguageModel } from '../fixtures/llm/mock-language-model';

describe('ProfileExtractor.extractProfile', () => {
  it('returns the parsed profile from the injected model, without calling Anthropic', async () => {
    const fakeProfile = buildProfile();
    const extractor = new ProfileExtractor(mockStructuredLanguageModel(fakeProfile));

    const result = await extractor.extractProfile('Lebenslauf-Text ...');

    expect(result).toEqual(fakeProfile);
  });
});
