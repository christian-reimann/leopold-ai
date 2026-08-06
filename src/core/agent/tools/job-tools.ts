import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { jobPostingService } from '@/core/jobs/jobposting-service';
import { matchingService } from '@/core/matching/matching-service';

export function jobTools(profileId: string): ToolSet {
  return {
    listRecentMatches: tool({
      description: 'Listet die zuletzt gefundenen, gematchten Jobangebote inkl. Score auf.',
      inputSchema: z.object({ limit: z.number().int().min(1).max(50).default(20) }),
      execute: async ({ limit }) => {
        const rows = await matchingService.listRecent(profileId, limit);
        return rows.map((row) => ({
          jobId: row.jobId,
          title: row.data.title,
          company: row.data.company,
          score: row.score,
        }));
      },
    }),

    getJobPosting: tool({
      description: 'Ruft Details zu einem einzelnen Jobangebot ab.',
      inputSchema: z.object({ jobId: z.uuid() }),
      execute: async ({ jobId }) => {
        const job = await jobPostingService.getById(jobId);
        return job.data;
      },
    }),

    rematchJobPosting: tool({
      description: 'Berechnet den Match-Score und die Begründung für ein Jobangebot neu.',
      inputSchema: z.object({ jobId: z.uuid() }),
      execute: async ({ jobId }) => {
        await matchingService.matchJob(jobId, profileId);
        return { success: true };
      },
    }),
  };
}
