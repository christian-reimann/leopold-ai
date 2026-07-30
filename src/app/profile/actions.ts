'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { profileService } from '@/core/profile/profile-service';
import { ProfileSchema } from '@/shared/schemas/profile';

const ProfileInputSchema = ProfileSchema.extend({ id: z.uuid().optional() });

export async function updateProfile(input: unknown): Promise<void> {
  const { id, ...profileData } = ProfileInputSchema.parse(input);
  await profileService.upsertManualProfile(id, profileData);
  revalidatePath('/profile');
}
