import { z } from 'zod';

export const MatchPointWeightSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type MatchPointWeight = z.infer<typeof MatchPointWeightSchema>;

export const MatchPointSchema = z.object({
  text: z.string(),
  weight: MatchPointWeightSchema,
});
export type MatchPoint = z.infer<typeof MatchPointSchema>;

export const MatchReasoningSchema = z.object({
  positives: z.array(MatchPointSchema),
  negatives: z.array(MatchPointSchema),
});
export type MatchReasoning = z.infer<typeof MatchReasoningSchema>;

export const MatchResultSchema = z.object({
  scoreMeToJob: z.number().min(0).max(100),
  positives: z.array(MatchPointSchema),
  negatives: z.array(MatchPointSchema),
});
export type MatchResult = z.infer<typeof MatchResultSchema>;
