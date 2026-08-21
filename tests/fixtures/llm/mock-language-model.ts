import { MockLanguageModelV3 } from 'ai/test';

/**
 * Builds a fake LanguageModel whose single doGenerate() call returns `output` as the
 * model's JSON text response - matches what generateText()'s Output.object({ schema })
 * expects to parse. Used to unit-test MatchJudge/ProfileExtractor without hitting Anthropic.
 */
export function mockStructuredLanguageModel(output: unknown): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: 'text', text: JSON.stringify(output) }],
      finishReason: { unified: 'stop', raw: undefined },
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 10, text: 10, reasoning: undefined },
        raw: undefined,
      },
      warnings: [],
    }),
  });
}
