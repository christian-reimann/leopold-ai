'use client';

import { Loader2, Plus } from 'lucide-react';
import { useState, useTransition } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ALL_CONNECTOR_IDS, connectorMetaFor } from '@/shared/connector-meta';
import type { NotificationInterval, SearchCriteria } from '@/shared/schemas/search-query';
import { deleteSearchQueryAction, runSearchQueryNowAction, setSearchQueryActiveAction } from './actions';
import {
  type DialogTarget,
  EMPLOYMENT_TYPE_LABELS,
  SearchQueryDialog,
  type SearchQueryRow,
} from './search-query-dialog';

const INTERVAL_LABELS: Record<NotificationInterval, string> = {
  instant: 'Stündlich',
  daily: 'Täglich',
};

function formatKeywords(criteria: SearchCriteria): string {
  return criteria.keywords.length > 0 ? criteria.keywords.join(', ') : 'Keine Stichwörter';
}

function formatDetails(query: SearchQueryRow): string {
  const { criteria } = query;
  const parts: string[] = [];
  if (criteria.location && criteria.radiusKm) {
    parts.push(`${criteria.location} (+${criteria.radiusKm}km)`);
  } else if (criteria.location) {
    parts.push(criteria.location);
  } else if (criteria.radiusKm) {
    parts.push(`Umkreis ${criteria.radiusKm}km`);
  }
  if (criteria.remote) {
    parts.push('Nur Remote');
  }
  if (criteria.employmentTypes && criteria.employmentTypes.length > 0) {
    parts.push(criteria.employmentTypes.map((type) => EMPLOYMENT_TYPE_LABELS[type] ?? type).join(', '));
  }
  parts.push(INTERVAL_LABELS[query.interval]);
  return parts.join(' · ');
}

export function SearchQueryList({ searchQueries }: { searchQueries: SearchQueryRow[] }) {
  const [dialogTarget, setDialogTarget] = useState<DialogTarget | null>(null);
  const [pendingAction, setPendingAction] = useState<{ id: string; kind: 'run' | 'toggle' | 'delete' } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function withPending(id: string, kind: 'run' | 'toggle' | 'delete', action: () => Promise<void>) {
    setError(null);
    setPendingAction({ id, kind });
    startTransition(async () => {
      try {
        await action();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Aktion fehlgeschlagen');
      } finally {
        setPendingAction(null);
      }
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Suchaufträge</h1>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={() => setDialogTarget({ mode: 'create' })}
          aria-label="Suchauftrag anlegen"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {searchQueries.length === 0 && <p className="text-sm text-neutral-500">Noch keine Suchaufträge angelegt.</p>}

      {searchQueries.length > 0 && (
        <ul className="divide-y divide-neutral-200">
          {searchQueries.map((query) => {
            return (
              <li key={query.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setDialogTarget({ mode: 'edit', query })}
                  className="-m-1 flex-1 rounded-md p-1 text-left hover:bg-neutral-50"
                >
                  <p className="text-base font-medium">
                    {formatKeywords(query.criteria)}{' '}
                    <Badge
                      variant="outline"
                      className={cn(
                        'h-4 rounded-full px-1.5 py-0 align-middle text-[10px] leading-none',
                        query.active
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700',
                      )}
                    >
                      {query.active ? 'Aktiv' : 'Pausiert'}
                    </Badge>
                  </p>
                  <p className="text-sm text-neutral-500">{formatDetails(query)}</p>
                  {query.criteria.connectors && query.criteria.connectors.length < ALL_CONNECTOR_IDS.length && (
                    <div className="flex items-center gap-1 pt-0.5">
                      {[...query.criteria.connectors]
                        .sort((a, b) => connectorMetaFor(a).label.localeCompare(connectorMetaFor(b).label))
                        .map((connectorId) => {
                          const meta = connectorMetaFor(connectorId);
                          return (
                            <Tooltip key={connectorId}>
                              <TooltipTrigger asChild>
                                <span className="cursor-default">{meta.logo}</span>
                              </TooltipTrigger>
                              <TooltipContent>{meta.label}</TooltipContent>
                            </Tooltip>
                          );
                        })}
                    </div>
                  )}
                </button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isPending && pendingAction?.id === query.id}
                    onClick={() => withPending(query.id, 'run', () => runSearchQueryNowAction(query.id))}
                  >
                    {isPending && pendingAction?.id === query.id && pendingAction.kind === 'run' && (
                      <Loader2 className="size-3.5 animate-spin" />
                    )}
                    Jetzt ausführen
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isPending && pendingAction?.id === query.id}
                    onClick={() =>
                      withPending(query.id, 'toggle', () => setSearchQueryActiveAction(query.id, !query.active))
                    }
                  >
                    {query.active ? 'Pausieren' : 'Aktivieren'}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={isPending && pendingAction?.id === query.id}
                      >
                        Löschen
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Suchauftrag löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Der Suchauftrag wird endgültig entfernt und läuft nicht mehr im Hintergrund.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => withPending(query.id, 'delete', () => deleteSearchQueryAction(query.id))}
                        >
                          Löschen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <SearchQueryDialog
        open={dialogTarget !== null}
        onOpenChange={(open) => !open && setDialogTarget(null)}
        target={dialogTarget}
      />
    </section>
  );
}
