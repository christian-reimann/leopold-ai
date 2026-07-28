import { desc } from 'drizzle-orm';
import { db } from '@/db/client';
import { documents } from '@/db/schema/documents';
import { profiles } from '@/db/schema/profiles';
import { DocumentList } from './document-list';
import { UploadDropzone } from './upload-dropzone';

export default async function WorkspacePage() {
  const [docs, [profile]] = await Promise.all([
    db.select().from(documents).orderBy(desc(documents.createdAt)),
    db.select({ status: profiles.status, error: profiles.error }).from(profiles).limit(1),
  ]);
  const hasPendingDocs = docs.some((doc) => doc.status === 'pending' || doc.status === 'processing');

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-4 text-lg font-semibold">Dokumente</h1>
        <UploadDropzone />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-600">Dokumente</h2>
        <DocumentList
          docs={docs.map((doc) => ({
            id: doc.id,
            name: doc.storagePath.split('/').pop() ?? doc.storagePath,
            type: doc.type,
            status: doc.status,
            error: doc.error,
          }))}
          hasProfile={Boolean(profile)}
          hasPendingDocs={hasPendingDocs}
          profileStatus={profile?.status ?? null}
          profileError={profile?.error ?? null}
        />
      </section>
    </div>
  );
}
