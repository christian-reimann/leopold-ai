'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { DocumentStatus, DocumentType } from '@/shared/schemas/document';
import type { ProfileStatus } from '@/shared/schemas/profile';
import { extractProfileAction, removeDocumentAction } from './actions';
import { AutoRefresh } from './auto-refresh';

const STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: 'Ausstehend',
  processing: 'Wird verarbeitet',
  done: 'Fertig',
  failed: 'Fehlgeschlagen',
};

const EMBEDDING_STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: 'Embedding ausstehend',
  processing: 'Wird eingebettet …',
  done: 'Eingebettet',
  failed: 'Embedding fehlgeschlagen',
};

const PROFILE_STATUS_LABELS: Record<ProfileStatus, string> = {
  pending: 'Ausstehend',
  processing: 'Wird extrahiert …',
  done: 'Fertig',
  failed: 'Fehlgeschlagen',
};

const TYPE_LABELS: Record<DocumentType, string> = {
  cv: 'Lebenslauf',
  cover_letter: 'Anschreiben',
  certificate: 'Zertifikat',
};

export type Document = {
  id: string;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  error: string | null;
  embeddingStatus: DocumentStatus;
  embeddingError: string | null;
};

export function DocumentList({
  docs,
  hasProfile,
  hasPendingDocs,
  profileStatus,
  profileError,
}: {
  docs: Document[];
  hasProfile: boolean;
  hasPendingDocs: boolean;
  profileStatus: ProfileStatus | null;
  profileError: string | null;
}) {
  const hasPendingEmbeddings = docs.some(
    (doc) => doc.status === 'done' && (doc.embeddingStatus === 'pending' || doc.embeddingStatus === 'processing'),
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Überbrückt die Lücke zwischen Klick und dem ersten Poll, der den Worker-Status
  // (profileStatus === 'processing') tatsächlich in der DB sieht.
  const [awaitingExtraction, setAwaitingExtraction] = useState(false);

  const doneDocs = useMemo(() => docs.filter((doc) => doc.status === 'done'), [docs]);

  useEffect(() => {
    if (awaitingExtraction && (profileStatus === 'done' || profileStatus === 'failed')) {
      setAwaitingExtraction(false);
    }
  }, [awaitingExtraction, profileStatus]);

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function handleExtract() {
    setError(null);
    startTransition(async () => {
      try {
        await extractProfileAction([...selected]);
        setSelected(new Set());
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
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Entfernen fehlgeschlagen');
      }
    });
  }

  return (
    <div className="space-y-3">
      <AutoRefresh
        active={hasPendingDocs || hasPendingEmbeddings || profileStatus === 'processing' || awaitingExtraction}
      />
      {docs.length === 0 && <p className="text-sm text-neutral-500">Noch keine Dokumente hochgeladen.</p>}
      {docs.length > 0 && (
        <ul className="divide-y divide-neutral-200 border border-neutral-200">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selected.has(doc.id)}
                  disabled={doc.status !== 'done' || isPending}
                  onCheckedChange={(checked) => toggle(doc.id, checked === true)}
                  aria-label={`${doc.name} auswählen`}
                />
                <div>
                  <p className="text-sm font-medium">{doc.name}</p>
                  <p className="text-xs text-neutral-500">{TYPE_LABELS[doc.type]}</p>
                  {doc.error && <p className="text-xs text-red-600">{doc.error}</p>}
                  {doc.embeddingError && <p className="text-xs text-red-600">{doc.embeddingError}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={doc.status === 'failed' ? 'destructive' : 'secondary'}>
                  {STATUS_LABELS[doc.status]}
                </Badge>
                {doc.status === 'done' && (
                  <Badge variant={doc.embeddingStatus === 'failed' ? 'destructive' : 'outline'}>
                    {EMBEDDING_STATUS_LABELS[doc.embeddingStatus]}
                  </Badge>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => handleRemove(doc.id)}
                >
                  Entfernen
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {doneDocs.length > 0 && (
        <div className="space-y-2 border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-xs text-neutral-500">
            Die Profil-Extraktion nutzt alle oben ausgewählten Dokumente gemeinsam als Datenpool.
            {hasProfile && ' Ein bestehendes Profil wird dabei vollständig überschrieben.'}
          </p>
          <div className="flex items-center gap-3">
            <Button type="button" size="sm" disabled={selected.size === 0 || isPending} onClick={handleExtract}>
              {isPending ? 'Extrahiert …' : `Profil aus ${selected.size} Dokument(en) extrahieren`}
            </Button>
            {profileStatus && (
              <Badge variant={profileStatus === 'failed' ? 'destructive' : 'secondary'}>
                {PROFILE_STATUS_LABELS[profileStatus]}
              </Badge>
            )}
            {profileStatus === 'failed' && profileError && <span className="text-sm text-red-600">{profileError}</span>}
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
