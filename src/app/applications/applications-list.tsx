'use client';

import { Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useTransition, type ReactNode } from 'react';
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
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatPostedAt } from '@/lib/format-posted-at';
import { connectorMetaFor } from '@/shared/connector-meta';
import type { DocumentStatus } from '@/shared/schemas/document';
import { deleteApplicationAction } from './actions';
import { AutoRefresh } from './auto-refresh';

export type ApplicationRow = {
  id: string;
  jobTitle: string;
  company: string;
  location?: string;
  postedAt?: string;
  url: string;
  sourceConnector: string;
  generationStatus: DocumentStatus;
};

export function ApplicationsList({ rows }: { rows: ApplicationRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const hasPending = rows.some((row) => row.generationStatus === 'pending' || row.generationStatus === 'processing');

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteApplicationAction(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <AutoRefresh active={hasPending} />
      <h1 className="text-xl font-semibold">Bewerbungen</h1>

      {rows.length === 0 && <p className="text-sm text-neutral-500">Noch keine Bewerbungen erstellt.</p>}

      {rows.length > 0 && (
        <ul className="divide-y divide-neutral-200">
          {rows.map((row) => {
            const connector = connectorMetaFor(row.sourceConnector);
            const postedAt = formatPostedAt(row.postedAt);

            return (
              <li key={row.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <Link href={`/applications/${row.id}`} className="min-w-0 flex-1 space-y-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate font-medium">{row.jobTitle}</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="shrink-0 cursor-default"
                        >
                          {connector.logo}
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>{connector.label}</TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-neutral-500">
                    {(
                      [
                        postedAt ? <span key="postedAt">{postedAt}</span> : null,
                        <span key="company">{row.company}</span>,
                        row.location ? <span key="location">{row.location}</span> : null,
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
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={isPending}
                      aria-label={`Bewerbung für ${row.jobTitle} löschen`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Bewerbung löschen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Die Bewerbung für „{row.jobTitle}" bei {row.company} wird unwiderruflich gelöscht.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={() => handleDelete(row.id)}>
                        Löschen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
