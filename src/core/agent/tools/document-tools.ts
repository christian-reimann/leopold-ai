import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { discardStagedAttachment, resolveStagedAttachment } from '@/core/documents/chat-attachments';
import { documentService } from '@/core/documents/document-service';
import { DocumentTypeSchema } from '@/shared/schemas/document';

const UPLOADS_DIR = path.join(process.cwd(), 'storage', 'uploads');

export function documentTools(profileId: string): ToolSet {
  return {
    addDocumentToProfile: tool({
      description:
        'Übernimmt eine im Chat hochgeladene, angehängte Datei dauerhaft ins Profil (Lebenslauf, Anschreiben oder Zertifikat). Nutze die attachmentId, die beim Hochladen im Chat-Verlauf genannt wurde – frag den Nutzer nach dem gewünschten Dokumenttyp, falls unklar.',
      inputSchema: z.object({ attachmentId: z.string(), documentType: DocumentTypeSchema }),
      execute: async ({ attachmentId, documentType }) => {
        const staged = await resolveStagedAttachment(attachmentId);
        if (staged.profileId !== profileId) {
          throw new Error(
            'Anhang gehört zu einem anderen Profil (evtl. wurde das aktive Profil zwischenzeitlich gewechselt).',
          );
        }

        await mkdir(UPLOADS_DIR, { recursive: true });
        const storagePath = path.join('storage', 'uploads', `${randomUUID()}-${staged.originalFilename}`);
        await rename(staged.storagePath, path.join(process.cwd(), storagePath));

        const documentId = await documentService.createDocumentAndWait({
          profileId,
          type: documentType,
          storagePath,
          originalFilename: staged.originalFilename,
        });
        await discardStagedAttachment(attachmentId);

        return { success: true, documentId };
      },
    }),

    listDocuments: tool({
      description: 'Listet alle hochgeladenen Dokumente (Lebenslauf, Anschreiben, Zertifikate) mit Status auf.',
      inputSchema: z.object({}),
      execute: async () => {
        const docs = await documentService.listAll(profileId);
        return docs.map((doc) => ({
          id: doc.id,
          type: doc.type,
          filename: doc.originalFilename,
          status: doc.status,
          embeddingStatus: doc.embeddingStatus,
        }));
      },
    }),

    changeDocumentType: tool({
      description: 'Ändert den Typ eines Dokuments (cv, cover_letter oder certificate).',
      inputSchema: z.object({ documentId: z.uuid(), type: DocumentTypeSchema }),
      execute: async ({ documentId, type }) => {
        await documentService.updateDocumentType(documentId, type);
        return { success: true };
      },
    }),

    requestProfileExtraction: tool({
      description:
        'Stößt die Profil-Extraktion aus den angegebenen Dokumenten an und wartet auf deren Abschluss.',
      inputSchema: z.object({ documentIds: z.array(z.uuid()).min(1) }),
      execute: async ({ documentIds }) => {
        await documentService.requestProfileExtractionAndWait(documentIds, profileId);
        return { success: true };
      },
    }),

    deleteDocument: tool({
      description: 'Löscht ein Dokument unwiderruflich. Erfordert Nutzer-Bestätigung.',
      inputSchema: z.object({ documentId: z.uuid() }),
      execute: async ({ documentId }) => {
        const storagePath = await documentService.deleteDocument(documentId);
        if (storagePath) {
          await rm(path.resolve(storagePath), { force: true });
        }
        return { success: true };
      },
    }),
  };
}
