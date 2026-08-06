import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { searchQueryService } from '@/core/jobs/search-query-service';
import { NotificationIntervalSchema, SearchCriteriaSchema } from '@/shared/schemas/search-query';

export function searchQueryTools(profileId: string): ToolSet {
  return {
    listSearchQueries: tool({
      description: 'Listet alle Suchaufträge (Kriterien, Intervall, aktiv/inaktiv) auf.',
      inputSchema: z.object({}),
      execute: async () => {
        const rows = await searchQueryService.listAll(profileId);
        return rows.map((row) => ({ id: row.id, criteria: row.criteria, interval: row.interval, active: row.active }));
      },
    }),

    createSearchQuery: tool({
      description: 'Legt einen neuen Suchauftrag an und plant ihn direkt ein.',
      inputSchema: z.object({ criteria: SearchCriteriaSchema, interval: NotificationIntervalSchema }),
      execute: async ({ criteria, interval }) => {
        const id = await searchQueryService.create(profileId, { criteria, interval });
        return { id };
      },
    }),

    updateSearchQuery: tool({
      description: 'Aktualisiert Kriterien und/oder Intervall eines bestehenden Suchauftrags.',
      inputSchema: z.object({
        searchQueryId: z.uuid(),
        criteria: SearchCriteriaSchema,
        interval: NotificationIntervalSchema,
      }),
      execute: async ({ searchQueryId, criteria, interval }) => {
        await searchQueryService.update(searchQueryId, { criteria, interval });
        return { success: true };
      },
    }),

    setSearchQueryActive: tool({
      description: 'Aktiviert oder deaktiviert einen Suchauftrag.',
      inputSchema: z.object({ searchQueryId: z.uuid(), active: z.boolean() }),
      execute: async ({ searchQueryId, active }) => {
        await searchQueryService.setActive(searchQueryId, active);
        return { success: true };
      },
    }),

    runSearchQueryNow: tool({
      description: 'Stößt einen Suchauftrag sofort an, statt auf das nächste geplante Intervall zu warten.',
      inputSchema: z.object({ searchQueryId: z.uuid() }),
      execute: async ({ searchQueryId }) => {
        await searchQueryService.runNow(searchQueryId);
        return { success: true };
      },
    }),

    deleteSearchQuery: tool({
      description: 'Löscht einen Suchauftrag unwiderruflich. Erfordert Nutzer-Bestätigung.',
      inputSchema: z.object({ searchQueryId: z.uuid() }),
      execute: async ({ searchQueryId }) => {
        await searchQueryService.delete(searchQueryId);
        return { success: true };
      },
    }),
  };
}
