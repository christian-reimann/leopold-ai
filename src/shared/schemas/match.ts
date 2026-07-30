import { z } from 'zod';

export const MatchResultSchema = z.object({
  scoreMeToJob: z.number().min(0).max(100),
  reasoning: z.string(),
});
export type MatchResult = z.infer<typeof MatchResultSchema>;
