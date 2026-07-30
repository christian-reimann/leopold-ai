'use server';

import { z } from 'zod';
import { documentService, type ChunkSearchResult } from '@/core/documents/document-service';

const SearchInputSchema = z.string().trim().min(1);

export async function searchChunksAction(query: string): Promise<ChunkSearchResult[]> {
  const value = SearchInputSchema.parse(query);
  return documentService.searchDocumentChunks(value);
}
