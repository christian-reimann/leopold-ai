import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { documentService } from '@/core/documents/document-service';
import { profileService } from '@/core/profile/profile-service';
import { db } from '@/db/client';
import { documentChunks } from '@/db/schema/document-chunks';
import { documents } from '@/db/schema/documents';
import { embeddingClient } from '@/llm/embeddings';
import { DocumentWorker } from '@/worker/document-worker';
import { truncateAll } from '../fixtures/db/test-db';

describe('DocumentWorker (integration, real BullMQ + Redis)', () => {
  let worker: DocumentWorker;
  let tempDir: string;

  beforeAll(async () => {
    worker = new DocumentWorker();
    tempDir = await mkdtemp(path.join(tmpdir(), 'leopold-document-worker-'));
  });

  afterAll(async () => {
    await worker.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await truncateAll();
  });

  it('parses a document and then embeds it - end to end via enqueue -> worker -> DB', async () => {
    vi.spyOn(embeddingClient, 'embedTexts').mockImplementation(async (texts) =>
      texts.map(() => Array(1024).fill(0.1)),
    );

    const profileId = await profileService.createProfile('Mein Profil');
    const filePath = path.join(tempDir, 'lebenslauf.txt');
    await writeFile(
      filePath,
      'Erster Absatz mit Erfahrung als Softwareentwicklerin.\n\nZweiter Absatz mit Ausbildung.',
      'utf-8',
    );

    const documentId = await documentService.createDocumentAndWait({
      profileId,
      type: 'cv',
      storagePath: filePath,
      originalFilename: 'lebenslauf.txt',
    });

    // createDocumentAndWait wartet nur auf den ParseDocument-Job; EmbedDocument wird von
    // parseDocumentById nur fire-and-forget nachgelegt (siehe document-service.ts) - daher
    // hier auf den asynchron laufenden Embedding-Schritt pollen.
    await vi.waitFor(
      async () => {
        const [document] = await db.select().from(documents).where(eq(documents.id, documentId));
        expect(document?.embeddingStatus).toBe('done');
      },
      { timeout: 10_000, interval: 100 },
    );

    const [document] = await db.select().from(documents).where(eq(documents.id, documentId));
    expect(document?.status).toBe('done');
    expect(document?.extractedText).toContain('Erster Absatz');

    const chunks = await db.select().from(documentChunks).where(eq(documentChunks.documentId, documentId));
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]?.embedding).toHaveLength(1024);
  });

  it('marks the document as failed when the file is missing, without embedding it', async () => {
    const profileId = await profileService.createProfile('Mein Profil');

    // enqueueParseDocumentAndWait's underlying job.waitUntilFinished rejects on job failure -
    // the document row itself was already inserted before the job ran, so it's still queryable.
    await documentService
      .createDocumentAndWait({
        profileId,
        type: 'cv',
        storagePath: path.join(tempDir, 'does-not-exist.txt'),
        originalFilename: 'does-not-exist.txt',
      })
      .catch(() => undefined);

    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.originalFilename, 'does-not-exist.txt'));

    expect(document?.status).toBe('failed');
    expect(document?.error).toBeTruthy();
    expect(document?.embeddingStatus).toBe('pending');
  });
});
