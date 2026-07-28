'use client';

import { useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ChunkSearchResult } from '@/core/documents/search-chunks';
import { searchChunksAction } from './actions';

const TYPE_LABELS: Record<string, string> = {
  cv: 'Lebenslauf',
  cover_letter: 'Anschreiben',
  certificate: 'Zertifikat',
};

export function SearchForm() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ChunkSearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSearch() {
    setError(null);
    startTransition(async () => {
      try {
        setResults(await searchChunksAction(query));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Suche fehlgeschlagen');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="z.B. Erfahrung mit React und TypeScript"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
        />
        <Button type="button" disabled={query.trim().length === 0 || isPending} onClick={handleSearch}>
          {isPending ? 'Sucht …' : 'Suchen'}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {results && results.length === 0 && (
        <p className="text-sm text-neutral-500">
          Keine Treffer. Sind bereits Dokumente hochgeladen und fertig eingebettet?
        </p>
      )}

      {results && results.length > 0 && (
        <ul className="space-y-3">
          {results.map((result) => (
            <li key={result.chunkId} className="space-y-1 border border-neutral-200 p-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{TYPE_LABELS[result.documentType] ?? result.documentType}</Badge>
                <span className="text-xs text-neutral-500">Ähnlichkeit: {result.similarity.toFixed(3)}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap text-neutral-800">{result.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
