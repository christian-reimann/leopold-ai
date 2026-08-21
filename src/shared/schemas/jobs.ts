import { z } from 'zod';

export const ParseDocumentJobSchema = z.object({
  documentId: z.uuid(),
});
export type ParseDocumentJob = z.infer<typeof ParseDocumentJobSchema>;

export const ExtractProfileJobSchema = z.object({
  documentIds: z.array(z.uuid()).min(1),
  profileId: z.uuid(),
});
export type ExtractProfileJob = z.infer<typeof ExtractProfileJobSchema>;

export const EmbedDocumentJobSchema = z.object({
  documentId: z.uuid(),
});
export type EmbedDocumentJob = z.infer<typeof EmbedDocumentJobSchema>;

export const RunSearchQueryJobSchema = z.object({
  searchQueryId: z.uuid(),
});
export type RunSearchQueryJob = z.infer<typeof RunSearchQueryJobSchema>;

export const GenerateApplicationContentJobSchema = z.object({
  applicationId: z.uuid(),
  instructions: z.string().optional(),
});
export type GenerateApplicationContentJob = z.infer<typeof GenerateApplicationContentJobSchema>;

export const CleanupStalePostingsJobSchema = z.object({});
export type CleanupStalePostingsJob = z.infer<typeof CleanupStalePostingsJobSchema>;
