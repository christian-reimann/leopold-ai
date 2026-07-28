'use server';

import { z } from 'zod';
import { searchDocumentChunks, type ChunkSearchResult } from '@/core/documents/search-chunks';

const SearchInputSchema = z.string().trim().min(1);

export async function searchChunksAction(query: string): Promise<ChunkSearchResult[]> {
  const value = SearchInputSchema.parse(query);
  return searchDocumentChunks(value);
}
