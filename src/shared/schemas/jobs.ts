import { z } from 'zod';

export const ParseDocumentJobSchema = z.object({
  documentId: z.uuid(),
});
export type ParseDocumentJob = z.infer<typeof ParseDocumentJobSchema>;

export const ExtractProfileJobSchema = z.object({
  documentIds: z.array(z.uuid()).min(1),
});
export type ExtractProfileJob = z.infer<typeof ExtractProfileJobSchema>;
