'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { requestPdfExportAction, regenerateApplicationContentAction, updateApplicationContentAction } from '@/app/applications/actions';
import { ApplicationSettingsDialog } from '@/app/applications/application-settings-dialog';
import type { ApplicationOptionsValue } from '@/app/applications/application-options-fields';
import { AutoRefresh } from '@/app/applications/auto-refresh';
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
  pdfStatus,
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
  pdfStatus: DocumentStatus;
  profilePersonal: Personal | null;
  documentStyles: string;
}) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isGenerating = generationStatus === 'pending' || generationStatus === 'processing';
  const isExportingPdf = pdfStatus === 'processing';

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

  function handleExportPdf() {
    startTransition(async () => {
      await requestPdfExportAction(applicationId);
    });
  }

  return (
    <div className="space-y-6">
      <AutoRefresh active={isGenerating || isExportingPdf} />

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
          <Button type="button" variant="outline" size="sm" onClick={handleRegenerate} disabled={isPending || isGenerating}>
            Neu generieren
          </Button>
          {pdfStatus === 'done' ? (
            <Button type="button" size="sm" asChild>
              <a href={`/api/applications/${applicationId}/pdf`}>PDF herunterladen</a>
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={handleExportPdf} disabled={isPending || isGenerating || isExportingPdf}>
              {isExportingPdf ? 'Wird exportiert …' : 'Als PDF exportieren'}
            </Button>
          )}
        </div>
      </div>

      {!isGenerating && (
        <div className="application-document rounded-md border border-neutral-200 bg-white p-10 shadow-sm">
          <style>{documentStyles}</style>

          {profilePersonal && (
            <header>
              <h1>{profilePersonal.name}</h1>
              <p>{profilePersonal.role}</p>
              <p>
                {profilePersonal.address.street}, {profilePersonal.address.zipcode} {profilePersonal.address.location}
              </p>
              <p>
                {profilePersonal.contact.email} · {profilePersonal.contact.phone}
              </p>
            </header>
          )}

          <section>
            <h2>Anschreiben</h2>
            <TiptapField content={letterContent ?? ''} onSave={handleSaveLetter} />
          </section>

          <section>
            <h2>Lebenslauf</h2>
            <TiptapField content={cvContent ?? ''} onSave={handleSaveCv} />
          </section>
        </div>
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
