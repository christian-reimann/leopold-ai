'use client';

import { CheckCircle2, File, FileImage, FileText, FileType, Loader2, X, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';
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
import { cn } from '@/lib/utils';
import { DOCUMENT_TYPES, type DocumentStatus, type DocumentType } from '@/shared/schemas/document';
import type { ProfileStatus } from '@/shared/schemas/profile';
import { AutoRefresh } from './auto-refresh';
import { extractProfileAction, removeDocumentAction, updateDocumentTypeAction } from './document-actions';

const TYPE_LABELS: Record<DocumentType, string> = {
  cv: 'Lebenslauf',
  cover_letter: 'Anschreiben',
  certificate: 'Zertifikat',
};

const FILE_ICONS: Record<string, { Icon: typeof File; className: string }> = {
  '.pdf': { Icon: FileText, className: 'text-red-600' },
  '.docx': { Icon: FileType, className: 'text-blue-600' },
  '.txt': { Icon: File, className: 'text-muted-foreground' },
  '.jpg': { Icon: FileImage, className: 'text-emerald-600' },
  '.jpeg': { Icon: FileImage, className: 'text-emerald-600' },
  '.png': { Icon: FileImage, className: 'text-emerald-600' },
  '.webp': { Icon: FileImage, className: 'text-emerald-600' },
};

function fileIconFor(name: string) {
  const extension = name.slice(name.lastIndexOf('.')).toLowerCase();
  return FILE_ICONS[extension] ?? { Icon: File, className: 'text-muted-foreground' };
}

export type DocumentTile = {
  id: string;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  error: string | null;
  embeddingStatus: DocumentStatus;
  embeddingError: string | null;
};

type TileState = 'running' | 'success' | 'failed';

function tileState(doc: DocumentTile): TileState {
  if (doc.status === 'failed' || doc.embeddingStatus === 'failed') return 'failed';
  if (doc.status === 'done' && doc.embeddingStatus === 'done') return 'success';
  return 'running';
}

export function DocumentTiles({
  docs,
  hasProfile,
  hasPendingDocs,
  profileStatus,
  profileError,
}: {
  docs: DocumentTile[];
  hasProfile: boolean;
  hasPendingDocs: boolean;
  profileStatus: ProfileStatus | null;
  profileError: string | null;
}) {
  const hasPendingEmbeddings = docs.some(
    (doc) => doc.status === 'done' && (doc.embeddingStatus === 'pending' || doc.embeddingStatus === 'processing'),
  );
  const [error, setError] = useState<string | null>(null);
  const [isExtracting, startExtractTransition] = useTransition();
  const [pendingDocId, setPendingDocId] = useState<string | null>(null);
  const [, startDocTransition] = useTransition();
  // Bridges the gap between the click and the first poll that actually sees the
  // worker status (profileStatus === 'processing') in the DB.
  const [awaitingExtraction, setAwaitingExtraction] = useState(false);

  const doneDocs = useMemo(() => docs.filter((doc) => doc.status === 'done'), [docs]);
  const isGenerating = isExtracting || profileStatus === 'processing' || awaitingExtraction;

  useEffect(() => {
    if (awaitingExtraction && (profileStatus === 'done' || profileStatus === 'failed')) {
      setAwaitingExtraction(false);
    }
  }, [awaitingExtraction, profileStatus]);

  function handleExtract() {
    setError(null);
    startExtractTransition(async () => {
      try {
        await extractProfileAction(doneDocs.map((doc) => doc.id));
        setAwaitingExtraction(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Extraktion fehlgeschlagen');
      }
    });
  }

  function handleRemove(id: string) {
    setError(null);
    setPendingDocId(id);
    startDocTransition(async () => {
      try {
        await removeDocumentAction(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Entfernen fehlgeschlagen');
      } finally {
        setPendingDocId(null);
      }
    });
  }

  function handleCycleType(doc: DocumentTile) {
    setError(null);
    const currentIndex = DOCUMENT_TYPES.indexOf(doc.type);
    const nextType = DOCUMENT_TYPES[(currentIndex + 1) % DOCUMENT_TYPES.length] ?? DOCUMENT_TYPES[0];
    setPendingDocId(doc.id);
    startDocTransition(async () => {
      try {
        await updateDocumentTypeAction(doc.id, nextType);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ändern des Dokumenttyps fehlgeschlagen');
      } finally {
        setPendingDocId(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      <AutoRefresh
        active={hasPendingDocs || hasPendingEmbeddings || profileStatus === 'processing' || awaitingExtraction}
      />
      {doneDocs.length > 0 && (
        <div className="flex items-center justify-end gap-3">
          {profileStatus === 'failed' && profileError && <span className="text-sm text-red-600">{profileError}</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" size="lg" disabled={isGenerating} className="cursor-pointer">
                {isGenerating && <Loader2 className="size-4 animate-spin" />}
                Profil generieren
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Profil generieren?</AlertDialogTitle>
                <AlertDialogDescription>
                  {hasProfile && 'Das bestehende Profil wird dabei vollständig überschrieben.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleExtract}>Profil generieren</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {docs.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Dokumente hochgeladen.</p>}
      {docs.length > 0 && (
        <ul className="divide-y divide-border">
          {docs.map((doc) => {
            const { Icon, className } = fileIconFor(doc.name);
            const state = tileState(doc);
            const errorMessage = doc.error ?? doc.embeddingError;

            return (
              <li key={doc.id} className="group flex flex-wrap items-center gap-x-3 gap-y-1 px-1 py-2">
                <Icon className={cn('size-4 shrink-0', className)} />
                <p className="min-w-0 flex-1 truncate text-sm font-medium" title={doc.name}>
                  {doc.name}
                </p>
                <button
                  type="button"
                  disabled={pendingDocId === doc.id}
                  onClick={() => handleCycleType(doc)}
                  className="shrink-0 rounded-4xl border border-border px-2 py-0.5 text-xs whitespace-nowrap text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Klicken, um den Dokumenttyp zu wechseln"
                >
                  {TYPE_LABELS[doc.type]}
                </button>
                <div className="shrink-0">
                  <StatusCell state={state} />
                </div>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  disabled={pendingDocId === doc.id}
                  onClick={() => handleRemove(doc.id)}
                  aria-label={`${doc.name} entfernen`}
                  className="shrink-0 opacity-0 group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </Button>
                {errorMessage && (
                  <p className="basis-full pl-7 text-xs text-red-600">{errorMessage}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const STATUS_CONFIG: Record<TileState, { Icon: typeof CheckCircle2; label: string; className: string }> = {
  running: { Icon: Loader2, label: 'Läuft', className: 'animate-spin text-muted-foreground' },
  failed: { Icon: XCircle, label: 'Fehler', className: 'text-red-600' },
  success: { Icon: CheckCircle2, label: 'Fertig', className: 'text-green-700' },
};

function StatusCell({ state }: { state: TileState }) {
  const { Icon, label, className } = STATUS_CONFIG[state];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Icon className={cn('size-4 cursor-default', className)} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
