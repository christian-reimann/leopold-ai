import { desc, eq, inArray } from 'drizzle-orm';
import puppeteer from 'puppeteer';
import { chunkSearchService } from '@/core/documents/search-chunks';
import { jobPostingService } from '@/core/jobs/jobposting-service';
import { profileService } from '@/core/profile/profile-service';
import { applicationQueue } from '@/core/queue/application-queue';
import { db } from '@/db/client';
import { applications } from '@/db/schema/applications';
import { documents } from '@/db/schema/documents';
import { jobPostings } from '@/db/schema/job-postings';
import { applicationGenerator } from '@/llm/application-generator';
import type { ApplicationOptions } from '@/shared/schemas/application';
import type { DocType } from './layout/layout-template';
import { layoutTemplateRegistry } from './layout/registered-layouts';

// RAG-Kontext für die Generierung stammt aus Lebenslauf/Zertifikaten, nicht aus früheren
// Anschreiben – die sollen ja gerade neu formuliert werden, nicht kopiert.
const RAG_DOCUMENT_TYPES = ['cv', 'certificate'] as const;

export class ApplicationService {
  async create(jobId: string, options: ApplicationOptions): Promise<string> {
    const [application] = await db
      .insert(applications)
      .values({ jobId, ...options })
      .returning({ id: applications.id });
    if (!application) {
      throw new Error('Bewerbung konnte nicht angelegt werden');
    }

    await applicationQueue.enqueueGenerateContent(application.id);
    return application.id;
  }

  async getById(id: string): Promise<typeof applications.$inferSelect> {
    const [application] = await db.select().from(applications).where(eq(applications.id, id));
    if (!application) {
      throw new Error(`Bewerbung nicht gefunden: ${id}`);
    }
    return application;
  }

  async listAll() {
    return db
      .select({ application: applications, job: jobPostings.data })
      .from(applications)
      .innerJoin(jobPostings, eq(applications.jobId, jobPostings.id))
      .orderBy(desc(applications.createdAt));
  }

  async updateOptions(id: string, patch: Partial<ApplicationOptions>): Promise<void> {
    await db
      .update(applications)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(applications.id, id));
  }

  async updateContent(id: string, patch: { cvContent?: string; letterContent?: string }): Promise<void> {
    await db
      .update(applications)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(applications.id, id));
  }

  async regenerate(id: string, instructions?: string): Promise<void> {
    await db
      .update(applications)
      .set({ generationStatus: 'pending', generationError: null, updatedAt: new Date() })
      .where(eq(applications.id, id));
    await applicationQueue.enqueueGenerateContent(id, instructions);
  }

  async delete(id: string): Promise<void> {
    await db.delete(applications).where(eq(applications.id, id));
  }

  async generateContent(id: string, instructions?: string): Promise<void> {
    await db
      .update(applications)
      .set({ generationStatus: 'processing', generationError: null, updatedAt: new Date() })
      .where(eq(applications.id, id));

    try {
      const application = await this.getById(id);
      const [job, profile, ragDocumentIds] = await Promise.all([
        jobPostingService.getById(application.jobId),
        profileService.getActiveProfile(),
        this.resolveRagDocumentIds(),
      ]);

      if (!profile?.data) {
        throw new Error('Kein aktives Profil vorhanden');
      }

      const ragResults = await chunkSearchService.search(`${job.data.title}\n${job.data.description}`, {
        documentIds: ragDocumentIds,
      });

      const generationInput = {
        profile: profile.data,
        job: job.data,
        ragChunks: ragResults.map((result) => result.content),
        tone: application.tone,
        personality: application.personality,
        language: application.language,
        instructions,
      };

      const [letterContent, cvContent] = await Promise.all([
        applicationGenerator.generateLetter(generationInput),
        applicationGenerator.generateCv(generationInput),
      ]);

      await db
        .update(applications)
        .set({
          cvContent,
          letterContent,
          generationStatus: 'done',
          updatedAt: new Date(),
        })
        .where(eq(applications.id, id));
    } catch (error) {
      await db
        .update(applications)
        .set({
          generationStatus: 'failed',
          generationError: error instanceof Error ? error.message : 'Unbekannter Fehler bei der Generierung',
          updatedAt: new Date(),
        })
        .where(eq(applications.id, id));
      throw error;
    }
  }

  async renderPdfBuffer(id: string, docType: DocType): Promise<Uint8Array> {
    const application = await this.getById(id);
    const content = docType === 'cv' ? application.cvContent : application.letterContent;
    if (!content) {
      throw new Error('Inhalt wurde noch nicht generiert');
    }

    const profile = await profileService.getActiveProfile();
    if (!profile?.data) {
      throw new Error('Kein aktives Profil vorhanden');
    }

    const template = layoutTemplateRegistry.getById(application.layoutTemplate);
    const html = template.renderDocument({
      profile: profile.data,
      docType,
      content,
      colorScheme: application.colorScheme,
    });

    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      return await page.pdf({ format: 'A4', printBackground: true });
    } finally {
      await browser.close();
    }
  }

  private async resolveRagDocumentIds(): Promise<string[]> {
    const rows = await db
      .select({ id: documents.id })
      .from(documents)
      .where(inArray(documents.type, RAG_DOCUMENT_TYPES));
    return rows.map((row) => row.id);
  }
}

export const applicationService = new ApplicationService();
