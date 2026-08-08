'use client';

import { ChevronDown, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { NewApplicationDialog } from '@/app/applications/new-application-dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { MatchSortBy } from '@/core/matching/matching-service';
import { formatPostedAt } from '@/lib/format-posted-at';
import { cn } from '@/lib/utils';
import { connectorMetaFor } from '@/shared/connector-meta';
import type { JobPosting } from '@/shared/schemas/job-posting';
import type { MatchReasoning } from '@/shared/schemas/match';
import { loadMoreJobsAction } from './actions';
import { JOBS_PAGE_SIZE } from './constants';

export type JobRow = {
  id: string;
  jobId: string;
  score: number;
  reasoning: MatchReasoning;
  data: JobPosting;
  sourceConnector: string;
  applicationId?: string;
};

const SORT_OPTIONS: { value: MatchSortBy; label: string }[] = [
  { value: 'score', label: 'Nach Score' },
  { value: 'postedAt', label: 'Nach Aktualität' },
];

export function JobsList({
  initialRows,
  sortBy,
  totalCount,
}: {
  initialRows: JobRow[];
  sortBy: MatchSortBy;
  totalCount: number;
}) {
  const [applicationTarget, setApplicationTarget] = useState<{ jobId: string; jobTitle: string } | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState(initialRows);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialRows.length === JOBS_PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingMoreRef = useRef(false);
  const offsetRef = useRef(initialRows.length);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingMoreRef.current) {
          void loadMore();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  async function loadMore() {
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const nextRows = await loadMoreJobsAction(offsetRef.current, sortBy);
      offsetRef.current += nextRows.length;
      setRows((prev) => [...prev, ...nextRows]);
      setHasMore(nextRows.length === JOBS_PAGE_SIZE);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">Jobs</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount === 1 ? '1 Stellenangebot gefunden' : `${totalCount} Stellenangebote gefunden`}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5 text-sm">
          {SORT_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={option.value === 'postedAt' ? '/jobs' : `/jobs?sort=${option.value}`}
              className={cn(
                'rounded px-2.5 py-1 transition-colors',
                sortBy === option.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">Noch keine Jobs – Suchaufträge laufen im Hintergrund.</p>
      )}

      {rows.length > 0 && (
        <ul className="divide-y divide-border">
          {rows.map((row) => {
            const connector = connectorMetaFor(row.sourceConnector);
            const postedAt = formatPostedAt(row.data.postedAt);
            const isExpanded = expandedIds.has(row.id);
            const hasReasoning = row.reasoning.positives.length > 0 || row.reasoning.negatives.length > 0;

            return (
              <li key={row.id} className="space-y-1 px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-1.5">
                    <a
                      href={row.data.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-base font-medium hover:underline"
                    >
                      {row.data.title}
                    </a>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-default">{connector.logo}</span>
                      </TooltipTrigger>
                      <TooltipContent>{connector.label}</TooltipContent>
                    </Tooltip>
                  </div>
                  <button
                    type="button"
                    onClick={() => hasReasoning && toggleExpanded(row.id)}
                    disabled={!hasReasoning}
                    aria-expanded={isExpanded}
                    className="flex shrink-0 items-center gap-1 text-lg font-semibold whitespace-nowrap disabled:cursor-default"
                  >
                    {Math.round(row.score)} %
                    {hasReasoning && (
                      <ChevronDown
                        className={cn('size-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')}
                      />
                    )}
                  </button>
                </div>
                <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
                  {(
                    [
                      postedAt ? <span key="postedAt">{postedAt}</span> : null,
                      <span key="company">{row.data.company}</span>,
                      row.data.location ? <span key="location">{row.data.location}</span> : null,
                    ] satisfies ReactNode[]
                  )
                    .filter((part) => part !== null)
                    .map((part, index) => (
                      <Fragment key={index}>
                        {index > 0 && <span>·</span>}
                        {part}
                      </Fragment>
                    ))}
                </p>
                {isExpanded && (
                  <div className="rounded-md border border-border bg-muted px-3 py-2">
                    <ReasoningList reasoning={row.reasoning} />
                  </div>
                )}
                {row.applicationId ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/applications/${row.applicationId}`}>Bewerbung öffnen</Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setApplicationTarget({ jobId: row.jobId, jobTitle: row.data.title })}
                  >
                    Bewerbung erstellen
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {isLoadingMore && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
        </div>
      )}

      {applicationTarget && (
        <NewApplicationDialog
          open={true}
          onOpenChange={(open) => !open && setApplicationTarget(null)}
          jobId={applicationTarget.jobId}
          jobTitle={applicationTarget.jobTitle}
        />
      )}
    </div>
  );
}

function ReasoningList({ reasoning }: { reasoning: MatchReasoning }) {
  const positives = [...reasoning.positives].sort((a, b) => b.weight - a.weight);
  const negatives = [...reasoning.negatives].sort((a, b) => b.weight - a.weight);

  return (
    <table className="border-collapse text-sm">
      <tbody>
        {positives.map((point, index) => (
          <tr key={`positive-${index}`}>
            <td className="pr-1.5 align-top font-mono whitespace-nowrap text-emerald-600">
              {'+'.repeat(point.weight)}
            </td>
            <td className="align-top text-foreground">{point.text}</td>
          </tr>
        ))}
        {negatives.map((point, index) => (
          <tr key={`negative-${index}`}>
            <td className="pr-1.5 align-top font-mono whitespace-nowrap text-red-600">{'-'.repeat(point.weight)}</td>
            <td className="align-top text-foreground">{point.text}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
