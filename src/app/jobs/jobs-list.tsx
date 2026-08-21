'use client';

import { ChevronDown, Loader2, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { NewApplicationDialog } from '@/app/applications/new-application-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { MatchSortBy } from '@/core/matching/matching-service';
import { formatPostedAt } from '@/lib/format-posted-at';
import { cn } from '@/lib/utils';
import { connectorMetaFor } from '@/shared/connector-meta';
import type { JobPosting } from '@/shared/schemas/job-posting';
import type { MatchReasoning } from '@/shared/schemas/match';
import { loadMoreJobsAction } from './actions';
import { JOBS_PAGE_SIZE, MAX_AGE_DAYS_LIMIT } from './constants';

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

function formatMaxAgeLabel(maxAgeDays: number): string {
  if (maxAgeDays >= MAX_AGE_DAYS_LIMIT) return 'Alle';
  if (maxAgeDays === 0) return 'Heute';
  if (maxAgeDays === 1) return '1 Tag';
  return `${maxAgeDays} Tage`;
}

export function JobsList({
  initialRows,
  sortBy,
  maxAgeDays,
  titleQuery,
  totalCount,
}: {
  initialRows: JobRow[];
  sortBy: MatchSortBy;
  maxAgeDays?: number;
  titleQuery?: string;
  totalCount: number;
}) {
  const router = useRouter();
  const [applicationTarget, setApplicationTarget] = useState<{ jobId: string; jobTitle: string } | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState(initialRows);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialRows.length === JOBS_PAGE_SIZE);
  const [sliderValue, setSliderValue] = useState(maxAgeDays ?? MAX_AGE_DAYS_LIMIT);
  const [titleInput, setTitleInput] = useState(titleQuery ?? '');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingMoreRef = useRef(false);
  const offsetRef = useRef(initialRows.length);
  const sliderValueRef = useRef(sliderValue);
  sliderValueRef.current = sliderValue;

  function commitMaxAge(value: number) {
    const params = new URLSearchParams();
    if (sortBy === 'postedAt') params.set('sort', sortBy);
    if (value < MAX_AGE_DAYS_LIMIT) params.set('maxAge', String(value));
    if (titleInput.trim()) params.set('title', titleInput.trim());
    const query = params.toString();
    router.push(query ? `/jobs?${query}` : '/jobs');
  }

  useEffect(() => {
    setRows(initialRows);
    offsetRef.current = initialRows.length;
    setHasMore(initialRows.length === JOBS_PAGE_SIZE);
  }, [initialRows]);

  useEffect(() => {
    if (titleInput === (titleQuery ?? '')) return;
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (sortBy === 'postedAt') params.set('sort', sortBy);
      if (sliderValueRef.current < MAX_AGE_DAYS_LIMIT) params.set('maxAge', String(sliderValueRef.current));
      if (titleInput.trim()) params.set('title', titleInput.trim());
      const query = params.toString();
      router.replace(query ? `/jobs?${query}` : '/jobs');
    }, 300);
    return () => clearTimeout(handle);
  }, [titleInput, titleQuery, sortBy, router]);

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
      const nextRows = await loadMoreJobsAction(offsetRef.current, sortBy, maxAgeDays, titleQuery);
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
          {SORT_OPTIONS.map((option) => {
            const params = new URLSearchParams();
            if (option.value === 'postedAt') params.set('sort', option.value);
            if (sliderValue < MAX_AGE_DAYS_LIMIT) params.set('maxAge', String(sliderValue));
            if (titleInput.trim()) params.set('title', titleInput.trim());
            const query = params.toString();
            return (
              <Link
                key={option.value}
                href={query ? `/jobs?${query}` : '/jobs'}
                className={cn(
                  'rounded px-2.5 py-1 transition-colors',
                  sortBy === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="max-w-xs flex-1 basis-56">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Max. Alter</span>
            <span className="text-sm text-muted-foreground">{formatMaxAgeLabel(sliderValue)}</span>
          </div>
          <div className="pt-1">
            <div className="flex h-8 items-center">
              <Slider
                min={0}
                max={MAX_AGE_DAYS_LIMIT}
                step={1}
                value={[sliderValue]}
                onValueChange={([value]) => setSliderValue(value ?? MAX_AGE_DAYS_LIMIT)}
                onValueCommit={([value]) => commitMaxAge(value ?? MAX_AGE_DAYS_LIMIT)}
              />
            </div>
          </div>
        </div>

        <div className="max-w-xs flex-1 basis-56">
          <div className="flex items-center justify-between">
            <span className="invisible text-sm" aria-hidden="true">
              Platzhalter
            </span>
          </div>
          <div className="pt-1">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={titleInput}
                onChange={(event) => setTitleInput(event.target.value)}
                placeholder="Jobs durchsuchen…"
                aria-label="Jobs durchsuchen"
                className="pl-8"
              />
            </div>
          </div>
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
                      <span key="company" className="font-medium text-foreground">
                        {row.data.company}
                      </span>,
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
