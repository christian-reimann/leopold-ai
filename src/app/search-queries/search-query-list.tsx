'use client';

import { useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { NotificationInterval, SearchCriteria } from '@/shared/schemas/search-query';
import { deleteSearchQueryAction, runSearchQueryNowAction, setSearchQueryActiveAction } from './actions';
import { SearchQueryForm } from './search-query-form';

const INTERVAL_LABELS: Record<NotificationInterval, string> = {
  instant: 'Stündlich',
  daily: 'Täglich',
};

export type SearchQueryRow = {
  id: string;
  criteria: SearchCriteria;
  interval: NotificationInterval;
  active: boolean;
};

function describeCriteria(criteria: SearchCriteria): string {
  const parts: string[] = [];
  if (criteria.keywords.length > 0) {
    parts.push(criteria.keywords.join(', '));
  }
  if (criteria.location) {
    parts.push(criteria.radiusKm ? `${criteria.location} (+${criteria.radiusKm}km)` : criteria.location);
  }
  if (criteria.remote) {
    parts.push('Remote');
  }
  if (criteria.employmentTypes && criteria.employmentTypes.length > 0) {
    parts.push(criteria.employmentTypes.join(', '));
  }
  return parts.length > 0 ? parts.join(' · ') : 'Keine Kriterien';
}

export function SearchQueryList({ searchQueries }: { searchQueries: SearchQueryRow[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function withPending(id: string, action: () => Promise<void>) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      try {
        await action();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Aktion fehlgeschlagen');
      } finally {
        setPendingId(null);
      }
    });
  }

  if (searchQueries.length === 0) {
    return <p className="text-sm text-neutral-500">Noch keine Suchaufträge angelegt.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="divide-y divide-neutral-200 border border-neutral-200">
        {searchQueries.map((query) =>
          editingId === query.id ? (
            <li key={query.id} className="px-4 py-3">
              <SearchQueryForm
                searchQueryId={query.id}
                initial={{ criteria: query.criteria, interval: query.interval }}
                onSaved={() => setEditingId(null)}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={query.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{describeCriteria(query.criteria)}</p>
                <p className="text-xs text-neutral-500">{INTERVAL_LABELS[query.interval]}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={query.active ? 'secondary' : 'outline'}>{query.active ? 'Aktiv' : 'Pausiert'}</Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending && pendingId === query.id}
                  onClick={() => withPending(query.id, () => runSearchQueryNowAction(query.id))}
                >
                  Jetzt ausführen
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isPending && pendingId === query.id}
                  onClick={() => setEditingId(query.id)}
                >
                  Bearbeiten
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isPending && pendingId === query.id}
                  onClick={() => withPending(query.id, () => setSearchQueryActiveAction(query.id, !query.active))}
                >
                  {query.active ? 'Pausieren' : 'Aktivieren'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isPending && pendingId === query.id}
                  onClick={() => withPending(query.id, () => deleteSearchQueryAction(query.id))}
                >
                  Löschen
                </Button>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
