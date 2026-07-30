import { documentService } from '@/core/documents/document-service';
import { profileService } from '@/core/profile/profile-service';
import { DocumentList } from './document-list';
import { UploadDropzone } from './upload-dropzone';

export default async function DocumentPage() {
  const [docs, profile] = await Promise.all([documentService.listAll(), profileService.getActiveProfile()]);
  const hasPendingDocs = docs.some(
    (doc) =>
      doc.status === 'pending' ||
      doc.status === 'processing' ||
      (doc.status === 'done' && (doc.embeddingStatus === 'pending' || doc.embeddingStatus === 'processing')),
  );

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
            embeddingStatus: doc.embeddingStatus,
            embeddingError: doc.embeddingError,
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
