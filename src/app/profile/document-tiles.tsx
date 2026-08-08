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
  const [isPending, startTransition] = useTransition();
  // Überbrückt die Lücke zwischen Klick und dem ersten Poll, der den Worker-Status
  // (profileStatus === 'processing') tatsächlich in der DB sieht.
  const [awaitingExtraction, setAwaitingExtraction] = useState(false);

  const doneDocs = useMemo(() => docs.filter((doc) => doc.status === 'done'), [docs]);
  const isGenerating = isPending || profileStatus === 'processing' || awaitingExtraction;

  useEffect(() => {
    if (awaitingExtraction && (profileStatus === 'done' || profileStatus === 'failed')) {
      setAwaitingExtraction(false);
    }
  }, [awaitingExtraction, profileStatus]);

  function handleExtract() {
    setError(null);
    startTransition(async () => {
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
    startTransition(async () => {
      try {
        await removeDocumentAction(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Entfernen fehlgeschlagen');
      }
    });
  }

  function handleCycleType(doc: DocumentTile) {
    setError(null);
    const currentIndex = DOCUMENT_TYPES.indexOf(doc.type);
    const nextType = DOCUMENT_TYPES[(currentIndex + 1) % DOCUMENT_TYPES.length] ?? DOCUMENT_TYPES[0];
    startTransition(async () => {
      try {
        await updateDocumentTypeAction(doc.id, nextType);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ändern des Dokumenttyps fehlgeschlagen');
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {docs.map((doc) => {
            const { Icon, className } = fileIconFor(doc.name);
            const state = tileState(doc);

            return (
              <div key={doc.id} className="group relative flex flex-col items-center gap-2 p-4">
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => handleRemove(doc.id)}
                  aria-label={`${doc.name} entfernen`}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </Button>

                <div className="relative flex h-12 w-12 items-center justify-center">
                  <Icon className={cn('size-10', className)} />
                  {state === 'running' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {state === 'success' && (
                    <CheckCircle2 className="absolute -right-1 -bottom-1 size-5 rounded-full bg-background text-green-600" />
                  )}
                  {state === 'failed' && (
                    <XCircle className="absolute -right-1 -bottom-1 size-5 rounded-full bg-background text-red-600" />
                  )}
                </div>

                <p className="w-full truncate text-center text-xs font-medium" title={doc.name}>
                  {doc.name}
                </p>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleCycleType(doc)}
                  className="rounded px-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Klicken, um den Dokumenttyp zu wechseln"
                >
                  {TYPE_LABELS[doc.type]}
                </button>
                {(doc.error ?? doc.embeddingError) && (
                  <p className="line-clamp-2 text-center text-[11px] text-red-600">{doc.error ?? doc.embeddingError}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
