import { describe, expect, it } from 'vitest';
import { MatchJudge } from '@/llm/match-judge';
import { buildJobPosting, buildProfile } from '../fixtures/shared';
import { mockStructuredLanguageModel } from '../fixtures/llm/mock-language-model';

describe('MatchJudge.judge', () => {
  it('returns the parsed match result from the injected model, without calling Anthropic', async () => {
    const fakeResult = {
      scoreMeToJob: 82,
      positives: [{ text: 'Sehr passende Erfahrung', weight: 3 }],
      negatives: [{ text: 'Kein Kubernetes', weight: 1 }],
    };
    const judge = new MatchJudge(mockStructuredLanguageModel(fakeResult));

    const result = await judge.judge(buildProfile(), buildJobPosting());

    expect(result).toEqual(fakeResult);
  });
});
