import { rm } from 'node:fs/promises';
import path from 'node:path';
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { documentService } from '@/core/documents/document-service';
import { DocumentTypeSchema } from '@/shared/schemas/document';

export const documentTools: ToolSet = {
  listDocuments: tool({
    description: 'Listet alle hochgeladenen Dokumente (Lebenslauf, Anschreiben, Zertifikate) mit Status auf.',
    inputSchema: z.object({}),
    execute: async () => {
      const docs = await documentService.listAll();
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
    description: 'Stößt die Profil-Extraktion aus den angegebenen Dokumenten an (läuft asynchron im Hintergrund).',
    inputSchema: z.object({ documentIds: z.array(z.uuid()).min(1) }),
    execute: async ({ documentIds }) => {
      await documentService.requestProfileExtraction(documentIds);
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
