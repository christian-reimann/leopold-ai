import { desc, eq, sql } from 'drizzle-orm';
import { jobPostingService } from '@/core/jobs/jobposting-service';
import { profileService } from '@/core/profile/profile-service';
import { db } from '@/db/client';
import { jobPostings } from '@/db/schema/job-postings';
import { matches } from '@/db/schema/matches';
import { matchJudge } from '@/llm/match-judge';

const MATCH_VORFILTER_SIMILARITY_THRESHOLD = 0.3;

export type MatchSortBy = 'score' | 'postedAt';

export class MatchingService {
  async matchJob(jobId: string, profileId: string): Promise<void> {
    const [job, profile] = await Promise.all([jobPostingService.getById(jobId), profileService.getProfile(profileId)]);

    if (!profile?.data || !profile.embedding || !job.embedding) {
      console.log(`[matching] Kein Profil mit Embedding vorhanden, überspringe Job ${jobId}`);
      return;
    }

    const similarity = this.cosineSimilarity(job.embedding, profile.embedding);
    if (similarity < MATCH_VORFILTER_SIMILARITY_THRESHOLD) {
      return;
    }

    const result = await matchJudge.judge(profile.data, job.data);
    const reasoning = { positives: result.positives, negatives: result.negatives };

    await db
      .insert(matches)
      .values({ profileId, jobId, scoreMeToJob: result.scoreMeToJob, reasoning })
      .onConflictDoUpdate({
        target: [matches.profileId, matches.jobId],
        set: { scoreMeToJob: result.scoreMeToJob, reasoning },
      });
  }

  async listRecent(profileId: string, limit = 50, sortBy: MatchSortBy = 'postedAt') {
    const orderBy = sortBy === 'postedAt' ? desc(sql`${jobPostings.data}->>'postedAt'`) : desc(matches.scoreMeToJob);

    return db
      .select({
        id: matches.id,
        score: matches.scoreMeToJob,
        reasoning: matches.reasoning,
        createdAt: matches.createdAt,
        jobId: jobPostings.id,
        data: jobPostings.data,
        sourceConnector: jobPostings.sourceConnector,
      })
      .from(matches)
      .innerJoin(jobPostings, eq(matches.jobId, jobPostings.id))
      .where(eq(matches.profileId, profileId))
      .orderBy(orderBy)
      .limit(limit);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, value, index) => sum + value * b[index]!, 0);
    const normA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
    const normB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));
    return dot / (normA * normB);
  }
}

export const matchingService = new MatchingService();
