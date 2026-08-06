import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { profileService } from '@/core/profile/profile-service';
import { ProfileSchema } from '@/shared/schemas/profile';

export function profileTools(profileId: string): ToolSet {
  return {
    getProfile: tool({
      description: 'Liest die strukturierten Profildaten des Nutzers (Stammdaten, Ausbildung, Erfahrung, Skills, ...).',
      inputSchema: z.object({}),
      execute: async () => {
        const profile = await profileService.getProfile(profileId);
        if (!profile?.data) {
          return { exists: false as const };
        }
        return { exists: true as const, profile: profile.data };
      },
    }),

    updateProfile: tool({
      description: 'Aktualisiert die Profildaten des Nutzers vollständig (alle Felder müssen mitgegeben werden).',
      inputSchema: z.object({ profile: ProfileSchema }),
      execute: async ({ profile }) => {
        await profileService.upsertManualProfile(profileId, profile);
        return { success: true };
      },
    }),
  };
}
