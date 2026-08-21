import { describe, expect, it } from 'vitest';
import { MatchResultSchema } from '@/shared/schemas/match';
import { buildMatchResult } from '../../fixtures/shared';

describe('MatchResultSchema', () => {
  it('parses a valid match result', () => {
    const result = MatchResultSchema.safeParse(buildMatchResult());
    expect(result.success).toBe(true);
  });

  it('rejects a score outside 0..100', () => {
    expect(MatchResultSchema.safeParse(buildMatchResult({ scoreMeToJob: 101 })).success).toBe(false);
    expect(MatchResultSchema.safeParse(buildMatchResult({ scoreMeToJob: -1 })).success).toBe(false);
  });

  it('rejects more than 4 positives', () => {
    const positives = Array.from({ length: 5 }, (_, index) => ({ text: `Punkt ${index}`, weight: 1 as const }));
    expect(MatchResultSchema.safeParse(buildMatchResult({ positives })).success).toBe(false);
  });

  it('rejects an out-of-range point weight', () => {
    const result = MatchResultSchema.safeParse(
      buildMatchResult({ positives: [{ text: 'Punkt', weight: 4 as never }] }),
    );
    expect(result.success).toBe(false);
  });
});
