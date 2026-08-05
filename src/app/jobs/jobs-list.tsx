'use client';

import Link from 'next/link';
import { Fragment, useState, type ReactNode } from 'react';
import { NewApplicationDialog } from '@/app/applications/new-application-dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { MatchSortBy } from '@/core/matching/matching-service';
import { cn } from '@/lib/utils';
import { connectorMetaFor } from '@/shared/connector-meta';
import type { JobPosting } from '@/shared/schemas/job-posting';
import type { MatchReasoning } from '@/shared/schemas/match';

export type JobRow = {
  id: string;
  jobId: string;
  score: number;
  reasoning: MatchReasoning;
  data: JobPosting;
  sourceConnector: string;
};

const SORT_OPTIONS: { value: MatchSortBy; label: string }[] = [
  { value: 'score', label: 'Nach Score' },
  { value: 'postedAt', label: 'Nach Aktualität' },
];

const relativeTimeFormat = new Intl.RelativeTimeFormat('de-DE', { numeric: 'auto' });

function formatPostedAt(postedAt?: string): string | null {
  if (!postedAt) return null;
  const date = new Date(postedAt);
  if (Number.isNaN(date.getTime())) return null;

  const diffDays = Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));

  if (diffDays < 14) {
    return relativeTimeFormat.format(-diffDays, 'day');
  }
  if (diffDays < 60) {
    return relativeTimeFormat.format(-Math.floor(diffDays / 7), 'week');
  }
  return relativeTimeFormat.format(-Math.floor(diffDays / 30), 'month');
}

export function JobsList({ rows, sortBy }: { rows: JobRow[]; sortBy: MatchSortBy }) {
  const [applicationTarget, setApplicationTarget] = useState<{ jobId: string; jobTitle: string } | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Jobs</h1>
          <p className="text-sm text-neutral-500">
            {rows.length === 1 ? '1 Stellenangebot gefunden' : `${rows.length} Stellenangebote gefunden`}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-neutral-200 p-0.5 text-sm">
          {SORT_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={option.value === 'postedAt' ? '/jobs' : `/jobs?sort=${option.value}`}
              className={cn(
                'rounded px-2.5 py-1 transition-colors',
                sortBy === option.value ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100',
              )}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-neutral-500">Noch keine Jobs – Suchaufträge laufen im Hintergrund.</p>
      )}

      {rows.length > 0 && (
        <ul className="divide-y divide-neutral-200">
          {rows.map((row) => {
            const connector = connectorMetaFor(row.sourceConnector);
            const postedAt = formatPostedAt(row.data.postedAt);

            return (
              <li key={row.id} className="space-y-1 px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <a
                      href={row.data.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-base font-medium hover:underline"
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-default text-lg font-semibold whitespace-nowrap">
                        {Math.round(row.score)} %
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm flex-col items-start gap-2 py-2 text-left whitespace-normal">
                      <ReasoningList reasoning={row.reasoning} />
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-neutral-500">
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
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setApplicationTarget({ jobId: row.jobId, jobTitle: row.data.title })}
                >
                  Bewerbung erstellen
                </Button>
              </li>
            );
          })}
        </ul>
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
  if (reasoning.positives.length === 0 && reasoning.negatives.length === 0) {
    return <p>Keine Begründung vorhanden.</p>;
  }

  return (
    <table className="border-collapse">
      <tbody>
        {reasoning.positives.map((point, index) => (
          <tr key={`positive-${index}`}>
            <td className="pr-1.5 align-top font-mono text-emerald-400">{'+'.repeat(point.weight)}</td>
            <td className="align-top">{point.text}</td>
          </tr>
        ))}
        {reasoning.negatives.map((point, index) => (
          <tr key={`negative-${index}`}>
            <td className="pr-1.5 align-top font-mono text-red-400">{'-'.repeat(point.weight)}</td>
            <td className="align-top">{point.text}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
