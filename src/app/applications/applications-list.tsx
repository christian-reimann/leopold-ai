'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { DocumentStatus } from '@/shared/schemas/document';
import { AutoRefresh } from './auto-refresh';

export type ApplicationRow = {
  id: string;
  jobTitle: string;
  company: string;
  generationStatus: DocumentStatus;
  pdfStatus: DocumentStatus;
};

const STATUS_VARIANT: Record<DocumentStatus, 'secondary' | 'default' | 'destructive'> = {
  pending: 'secondary',
  processing: 'secondary',
  done: 'default',
  failed: 'destructive',
};

const STATUS_LABEL: Record<DocumentStatus, string> = {
  pending: 'Wartet',
  processing: 'Wird generiert …',
  done: 'Generiert',
  failed: 'Fehlgeschlagen',
};

const PDF_LABEL: Record<DocumentStatus, string> = {
  pending: 'Kein PDF',
  processing: 'PDF wird erstellt …',
  done: 'PDF fertig',
  failed: 'PDF fehlgeschlagen',
};

export function ApplicationsList({ rows }: { rows: ApplicationRow[] }) {
  const hasPending = rows.some(
    (row) =>
      row.generationStatus === 'pending' ||
      row.generationStatus === 'processing' ||
      row.pdfStatus === 'processing',
  );

  return (
    <div className="space-y-4">
      <AutoRefresh active={hasPending} />
      <h1 className="text-xl font-semibold">Bewerbungen</h1>

      {rows.length === 0 && <p className="text-sm text-neutral-500">Noch keine Bewerbungen erstellt.</p>}

      {rows.length > 0 && (
        <ul className="divide-y divide-neutral-200">
          {rows.map((row) => (
            <li key={row.id} className="px-4 py-3">
              <Link href={`/applications/${row.id}`} className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{row.jobTitle}</p>
                  <p className="text-sm text-neutral-500">{row.company}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[row.generationStatus]}>{STATUS_LABEL[row.generationStatus]}</Badge>
                  {row.generationStatus === 'done' && <Badge variant="outline">{PDF_LABEL[row.pdfStatus]}</Badge>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
