import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';

export const CHAT_ATTACHMENTS_DIR = path.join(process.cwd(), 'storage', 'chat-uploads');

export type StagedAttachment = {
  storagePath: string;
  originalFilename: string;
  extension: string;
};

type StagedAttachmentMeta = { originalFilename: string; extension: string };

export async function resolveStagedAttachment(attachmentId: string): Promise<StagedAttachment> {
  const metaPath = path.join(CHAT_ATTACHMENTS_DIR, `${attachmentId}.json`);
  let meta: StagedAttachmentMeta;
  try {
    meta = JSON.parse(await readFile(metaPath, 'utf-8'));
  } catch {
    throw new Error('Anhang nicht gefunden (evtl. abgelaufen) – bitte erneut hochladen.');
  }

  return {
    storagePath: path.join(CHAT_ATTACHMENTS_DIR, `${attachmentId}${meta.extension}`),
    originalFilename: meta.originalFilename,
    extension: meta.extension,
  };
}

export async function discardStagedAttachment(attachmentId: string): Promise<void> {
  await rm(path.join(CHAT_ATTACHMENTS_DIR, `${attachmentId}.json`), { force: true });
}
