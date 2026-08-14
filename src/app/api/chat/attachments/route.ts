import { randomUUID } from 'node:crypto';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CHAT_ATTACHMENTS_DIR } from '@/core/documents/chat-attachments';
import { documentService } from '@/core/documents/document-service';
import { getActiveProfileId } from '@/core/profile/active-profile';

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

// No dedicated cleanup job for orphaned chat uploads (attachments that were never
// picked up via addDocumentToProfile) – instead, each new upload incidentally cleans
// up old files along the way. Sufficient for the MVP scope (single user, low volume).
async function cleanupStale(): Promise<void> {
  const entries = await readdir(CHAT_ATTACHMENTS_DIR).catch(() => []);
  const now = Date.now();
  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(CHAT_ATTACHMENTS_DIR, entry);
      const info = await stat(fullPath).catch(() => null);
      if (info && now - info.mtimeMs > MAX_AGE_MS) {
        await rm(fullPath, { force: true });
      }
    }),
  );
}

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: 'Keine Datei übergeben' }, { status: 400 });
  }

  const extension = path.extname(file.name).toLowerCase();
  if (!documentService.isSupportedDocumentExtension(extension)) {
    return Response.json({ error: `Nicht unterstütztes Dateiformat: ${extension}` }, { status: 400 });
  }

  await mkdir(CHAT_ATTACHMENTS_DIR, { recursive: true });
  await cleanupStale();

  const profileId = await getActiveProfileId();
  const attachmentId = randomUUID();
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(CHAT_ATTACHMENTS_DIR, `${attachmentId}${extension}`), buffer);
  await writeFile(
    path.join(CHAT_ATTACHMENTS_DIR, `${attachmentId}.json`),
    JSON.stringify({ originalFilename: file.name, extension, profileId }),
  );

  return Response.json({ attachmentId, filename: file.name });
}
