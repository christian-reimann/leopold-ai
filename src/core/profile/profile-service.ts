import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { profiles } from '@/db/schema/profiles';
import { embeddingClient } from '@/llm/embeddings';
import type { Profile } from '@/shared/schemas/profile';

export class ProfileService {
  async getProfile(profileId: string): Promise<typeof profiles.$inferSelect | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId));
    return profile;
  }

  async listProfiles(): Promise<(typeof profiles.$inferSelect)[]> {
    return db.select().from(profiles).orderBy(profiles.createdAt);
  }

  async createProfile(name: string): Promise<string> {
    const [created] = await db.insert(profiles).values({ name }).returning({ id: profiles.id });
    if (!created) {
      throw new Error('Profil konnte nicht angelegt werden');
    }
    return created.id;
  }

  async upsertManualProfile(id: string, data: Profile): Promise<void> {
    const embedding = await embeddingClient.embedText(this.embeddingInput(data));
    await db.update(profiles).set({ data, embedding, updatedAt: new Date() }).where(eq(profiles.id, id));
  }

  /** Markiert das Profil als "processing". Für `DocumentService.extractProfileFromDocuments`. */
  async beginExtraction(profileId: string): Promise<void> {
    await db
      .update(profiles)
      .set({ status: 'processing', error: null, updatedAt: new Date() })
      .where(eq(profiles.id, profileId));
  }

  async completeExtraction(profileId: string, data: Profile): Promise<void> {
    const embedding = await embeddingClient.embedText(this.embeddingInput(data));
    await db
      .update(profiles)
      .set({ data, status: 'done', error: null, embedding, updatedAt: new Date() })
      .where(eq(profiles.id, profileId));
  }

  async failExtraction(profileId: string, error: string): Promise<void> {
    await db.update(profiles).set({ status: 'failed', error, updatedAt: new Date() }).where(eq(profiles.id, profileId));
  }

  private embeddingInput(data: Profile): string {
    const skills = data.skills.flatMap((category) => category.skills).join(', ');
    const experiences = data.experiences
      .map((experience) => `${experience.role}: ${experience.description}`)
      .join('\n');
    const education = data.education.map((entry) => `${entry.degree}: ${entry.description}`).join('\n');
    const languages = data.languages.map((language) => language.language).join(', ');
    return [data.personal.role, skills, experiences, education, languages].join('\n');
  }
}

export const profileService = new ProfileService();
