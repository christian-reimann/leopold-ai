import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { applicationService } from '@/core/applications/application-service';
import { ApplicationOptionsSchema } from '@/shared/schemas/application';

const ApplicationIdSchema = z.object({ applicationId: z.uuid() });

/**
 * Bewusst kein `createApplication`-Tool – Erstanlage bleibt dem "Neue Bewerbung"-Dialog
 * vorbehalten (Job-Auswahl ist eine explizite UI-Entscheidung).
 */
export function applicationTools(profileId: string): ToolSet {
  return {
    listApplications: tool({
      description: 'Listet alle Bewerbungen mit Status auf.',
      inputSchema: z.object({}),
      execute: async () => {
        const rows = await applicationService.listAll(profileId);
        return rows.map(({ application, job }) => ({
          id: application.id,
          jobTitle: job.title,
          company: job.company,
          status: application.status,
          generationStatus: application.generationStatus,
        }));
      },
    }),

    getApplication: tool({
      description: 'Ruft die Details einer Bewerbung ab (Einstellungen, Status, Inhalt).',
      inputSchema: ApplicationIdSchema,
      execute: async ({ applicationId }) => {
        return applicationService.getById(applicationId);
      },
    }),

    updateApplicationOptions: tool({
      description: 'Ändert Tonalität, Persönlichkeit, Sprache, Layout und/oder Farbschema einer Bewerbung.',
      inputSchema: ApplicationIdSchema.extend({ options: ApplicationOptionsSchema.partial() }),
      execute: async ({ applicationId, options }) => {
        await applicationService.updateOptions(applicationId, options);
        return { success: true };
      },
    }),

    updateApplicationContent: tool({
      description:
        'Ändert den Inhalt (HTML) von Anschreiben und/oder Lebenslauf einer Bewerbung gezielt, ohne eine komplette Neugenerierung anzustoßen. Für punktuelle Textänderungen, nicht für einen kompletten Ton-/Stilwechsel (dafür regenerateApplicationContent nutzen).',
      inputSchema: ApplicationIdSchema.extend({
        cvContent: z.string().optional(),
        letterContent: z.string().optional(),
      }),
      execute: async ({ applicationId, cvContent, letterContent }) => {
        await applicationService.updateContent(applicationId, { cvContent, letterContent });
        return { success: true };
      },
    }),

    regenerateApplicationContent: tool({
      description:
        'Generiert Anschreiben und Lebenslauf einer Bewerbung neu, optional mit einer zusätzlichen Anweisung (z.B. "mach den Ton lockerer").',
      inputSchema: ApplicationIdSchema.extend({ instructions: z.string().optional() }),
      execute: async ({ applicationId, instructions }) => {
        await applicationService.regenerate(applicationId, instructions);
        return { success: true };
      },
    }),

    deleteApplication: tool({
      description: 'Löscht eine Bewerbung unwiderruflich. Erfordert Nutzer-Bestätigung.',
      inputSchema: ApplicationIdSchema,
      execute: async ({ applicationId }) => {
        await applicationService.delete(applicationId);
        return { success: true };
      },
    }),
  };
}
