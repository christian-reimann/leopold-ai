'use server';

import { revalidatePath } from 'next/cache';
import { getActiveProfileId } from '@/core/profile/active-profile';
import { profileService } from '@/core/profile/profile-service';
import { ProfileSchema } from '@/shared/schemas/profile';

export async function updateProfile(input: unknown): Promise<void> {
  const profileData = ProfileSchema.parse(input);
  const profileId = await getActiveProfileId();
  await profileService.upsertManualProfile(profileId, profileData);
  revalidatePath('/profile');
}
