'use client';

import { Download, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { DOC_TYPE_LABELS, type DocType } from '@/core/applications/layout/layout-template';
import { cn } from '@/lib/utils';
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
import {
  deleteApplicationAction,
  regenerateApplicationContentAction,
  updateApplicationContentAction,
} from '@/app/applications/actions';
import { ApplicationSettingsDialog } from '@/app/applications/application-settings-dialog';
import type { ApplicationOptionsValue } from '@/app/applications/application-options-fields';
import { AutoRefresh } from '@/app/applications/auto-refresh';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Personal } from '@/shared/schemas/profile';
import type { DocumentStatus } from '@/shared/schemas/document';
import { TiptapField } from './tiptap-field';

export function ApplicationDetailBody({
  applicationId,
  jobTitle,
  company,
  cvContent,
  letterContent,
  options,
  generationStatus,
  profilePersonal,
  documentStyles,
}: {
  applicationId: string;
  jobTitle: string;
  company: string;
  cvContent: string | null;
  letterContent: string | null;
  options: ApplicationOptionsValue;
  generationStatus: DocumentStatus;
  profilePersonal: Personal | null;
  documentStyles: string;
}) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [downloadingDoc, setDownloadingDoc] = useState<DocType | null>(null);

  const isGenerating = generationStatus === 'pending' || generationStatus === 'processing';

  function handleSaveCv(html: string) {
    startTransition(async () => {
      await updateApplicationContentAction(applicationId, { cvContent: html });
      router.refresh();
    });
  }

  function handleSaveLetter(html: string) {
    startTransition(async () => {
      await updateApplicationContentAction(applicationId, { letterContent: html });
      router.refresh();
    });
  }

  function handleRegenerate() {
    startTransition(async () => {
      await regenerateApplicationContentAction(applicationId);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteApplicationAction(applicationId);
      router.push('/applications');
    });
  }

  async function handleDownloadPdf(docType: DocType) {
    setDownloadingDoc(docType);
    try {
      const response = await fetch(`/api/applications/${applicationId}/pdf?doc=${docType}`);
      if (!response.ok) throw new Error('PDF-Export fehlgeschlagen');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${docType === 'cv' ? 'lebenslauf' : 'anschreiben'}-${applicationId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingDoc(null);
    }
  }

  return (
    <div className="space-y-6">
      <AutoRefresh active={isGenerating} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{jobTitle}</h1>
          <p className="text-sm text-neutral-500">{company}</p>
        </div>
        <div className="flex items-center gap-2">
          {isGenerating && <Badge variant="secondary">Wird generiert …</Badge>}
          <Button type="button" variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            Einstellungen
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={isPending || isGenerating}
          >
            Neu generieren
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm" disabled={isPending} aria-label="Bewerbung löschen">
                <Trash2 className="size-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Bewerbung löschen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Die Bewerbung für „{jobTitle}" bei {company} wird unwiderruflich gelöscht.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleDelete}>
                  Löschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <style>{documentStyles}</style>

      {!isGenerating && (
        <Tabs defaultValue="letter">
          <TabsList>
            <TabsTrigger value="letter">Anschreiben</TabsTrigger>
            <TabsTrigger value="cv">Lebenslauf</TabsTrigger>
          </TabsList>

          <TabsContent value="letter">
            <div className="application-document relative space-y-3 rounded-md border border-neutral-200 bg-white p-10 shadow-sm">
              <PdfDownloadButton
                className="absolute right-10 top-10"
                isDownloading={downloadingDoc === 'letter'}
                disabled={downloadingDoc !== null}
                onClick={() => handleDownloadPdf('letter')}
              />
              <DocumentHeader personal={profilePersonal} />
              <section>
                <h2>{DOC_TYPE_LABELS.letter}</h2>
                <TiptapField content={letterContent ?? ''} onSave={handleSaveLetter} />
              </section>
            </div>
          </TabsContent>

          <TabsContent value="cv">
            <div className="application-document relative space-y-3 rounded-md border border-neutral-200 bg-white p-10 shadow-sm">
              <PdfDownloadButton
                className="absolute right-10 top-10"
                isDownloading={downloadingDoc === 'cv'}
                disabled={downloadingDoc !== null}
                onClick={() => handleDownloadPdf('cv')}
              />
              <DocumentHeader personal={profilePersonal} />
              <section>
                <h2>{DOC_TYPE_LABELS.cv}</h2>
                <TiptapField content={cvContent ?? ''} onSave={handleSaveCv} />
              </section>
            </div>
          </TabsContent>
        </Tabs>
      )}

      <ApplicationSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        applicationId={applicationId}
        initialOptions={options}
      />
    </div>
  );
}

function PdfDownloadButton({
  className,
  isDownloading,
  disabled,
  onClick,
}: {
  className?: string;
  isDownloading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('shrink-0', className)}
      onClick={onClick}
      disabled={disabled}
    >
      {isDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      Als PDF herunterladen
    </Button>
  );
}

function DocumentHeader({ personal }: { personal: Personal | null }) {
  if (!personal) return null;

  return (
    <header>
      <h1>{personal.name}</h1>
      <p>{personal.role}</p>
      <p>
        {personal.address.street}, {personal.address.zipcode} {personal.address.location}
      </p>
      <p>
        {personal.contact.email} · {personal.contact.phone}
      </p>
    </header>
  );
}
