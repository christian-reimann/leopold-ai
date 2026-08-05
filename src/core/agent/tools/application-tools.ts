import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { applicationService } from '@/core/applications/application-service';
import { ApplicationOptionsSchema } from '@/shared/schemas/application';
import type { AgentContext } from '../context';

const OptionalApplicationIdSchema = z.object({ applicationId: z.uuid().optional() });

function resolveApplicationId(context: AgentContext, applicationId: string | undefined): string {
  const resolved = applicationId ?? (context.scope === 'application' ? context.applicationId : undefined);
  if (!resolved) {
    throw new Error('applicationId ist erforderlich (im globalen Chat gibt es keine aktuelle Bewerbung).');
  }
  return resolved;
}

/**
 * Factory statt statisches Objekt: im application-Scope wird applicationId per Closure als
 * Default injiziert, damit der Agent im Bewerbungs-Chat nicht raten muss, welche Bewerbung
 * gemeint ist. Bewusst kein `createApplication`-Tool – Erstanlage bleibt dem "Neue
 * Bewerbung"-Dialog vorbehalten (Job-Auswahl ist eine explizite UI-Entscheidung).
 */
export function createApplicationTools(context: AgentContext): ToolSet {
  return {
    listApplications: tool({
      description: 'Listet alle Bewerbungen mit Status auf.',
      inputSchema: z.object({}),
      execute: async () => {
        const rows = await applicationService.listAll();
        return rows.map(({ application, job }) => ({
          id: application.id,
          jobTitle: job.title,
          company: job.company,
          status: application.status,
          generationStatus: application.generationStatus,
          pdfStatus: application.pdfStatus,
        }));
      },
    }),

    getApplication: tool({
      description: 'Ruft die Details einer Bewerbung ab (Einstellungen, Status, Inhalt).',
      inputSchema: OptionalApplicationIdSchema,
      execute: async ({ applicationId }) => {
        return applicationService.getById(resolveApplicationId(context, applicationId));
      },
    }),

    updateApplicationOptions: tool({
      description: 'Ändert Tonalität, Persönlichkeit, Sprache, Layout und/oder Farbschema einer Bewerbung.',
      inputSchema: OptionalApplicationIdSchema.extend({ options: ApplicationOptionsSchema.partial() }),
      execute: async ({ applicationId, options }) => {
        await applicationService.updateOptions(resolveApplicationId(context, applicationId), options);
        return { success: true };
      },
    }),

    regenerateApplicationContent: tool({
      description:
        'Generiert Anschreiben und Lebenslauf einer Bewerbung neu, optional mit einer zusätzlichen Anweisung (z.B. "mach den Ton lockerer").',
      inputSchema: OptionalApplicationIdSchema.extend({ instructions: z.string().optional() }),
      execute: async ({ applicationId, instructions }) => {
        await applicationService.regenerate(resolveApplicationId(context, applicationId), instructions);
        return { success: true };
      },
    }),

    requestApplicationPdfExport: tool({
      description: 'Stößt den PDF-Export einer Bewerbung an (läuft asynchron im Hintergrund).',
      inputSchema: OptionalApplicationIdSchema,
      execute: async ({ applicationId }) => {
        await applicationService.requestPdfExport(resolveApplicationId(context, applicationId));
        return { success: true };
      },
    }),

    deleteApplication: tool({
      description: 'Löscht eine Bewerbung unwiderruflich. Erfordert Nutzer-Bestätigung.',
      inputSchema: OptionalApplicationIdSchema,
      execute: async ({ applicationId }) => {
        await applicationService.delete(resolveApplicationId(context, applicationId));
        return { success: true };
      },
    }),
  };
}
