'use client';

import { Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
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
import type { DocumentStatus } from '@/shared/schemas/document';
import { deleteApplicationAction } from './actions';
import { AutoRefresh } from './auto-refresh';

export type ApplicationRow = {
  id: string;
  jobTitle: string;
  company: string;
  generationStatus: DocumentStatus;
};

export function ApplicationsList({ rows }: { rows: ApplicationRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const hasPending = rows.some(
    (row) => row.generationStatus === 'pending' || row.generationStatus === 'processing',
  );

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
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <Link href={`/applications/${row.id}`} className="min-w-0 flex-1">
                <p className="font-medium">{row.jobTitle}</p>
                <p className="text-sm text-neutral-500">{row.company}</p>
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
          ))}
        </ul>
      )}
    </div>
  );
}
