'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Profile, ProfileStatus } from '@/shared/schemas/profile';
import { DocumentTiles, type DocumentTile } from './document-tiles';
import { ProfileView } from './profile-view';
import { PersonalDialog } from './personal-dialog';
import { UploadDropzone } from './upload-dropzone';

type Mode = 'documents' | null;

export function ProfilePageBody({
  hasProfile,
  profileId,
  profile,
  profileStatus,
  profileError,
  docs,
  hasPendingDocs,
}: {
  hasProfile: boolean;
  profileId?: string;
  profile: Profile;
  profileStatus: ProfileStatus | null;
  profileError: string | null;
  docs: DocumentTile[];
  hasPendingDocs: boolean;
}) {
  const [mode, setMode] = useState<Mode>(null);
  const [createOpen, setCreateOpen] = useState(false);

  if (!hasProfile && mode === null) {
    return (
      <>
        <div className="space-y-4 rounded-lg border border-dashed border-neutral-300 p-10 text-center">
          <p className="text-sm text-neutral-500">
            Noch kein Profil vorhanden. Lege eines manuell an oder lade Dokumente hoch, um daraus automatisch eines zu
            generieren.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Profil manuell anlegen
            </Button>
            <Button type="button" variant="outline" onClick={() => setMode('documents')}>
              Dokumente hochladen
            </Button>
          </div>
        </div>
        <PersonalDialog open={createOpen} onOpenChange={setCreateOpen} profile={profile} profileId={profileId} />
      </>
    );
  }

  return (
    <div className="space-y-10">
      {hasProfile && <ProfileView profile={profile} profileId={profileId} />}

      {(hasProfile || mode === 'documents') && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Dokumente</h2>
          <DocumentTiles
            docs={docs}
            hasProfile={hasProfile}
            hasPendingDocs={hasPendingDocs}
            profileStatus={profileStatus}
            profileError={profileError}
          />
          <UploadDropzone />
        </section>
      )}

      {!hasProfile && mode === 'documents' && (
        <>
          <p className="text-sm text-neutral-500">
            Oder{' '}
            <button type="button" className="underline" onClick={() => setCreateOpen(true)}>
              Profil manuell anlegen
            </button>
            .
          </p>
          <PersonalDialog open={createOpen} onOpenChange={setCreateOpen} profile={profile} profileId={profileId} />
        </>
      )}
    </div>
  );
}
