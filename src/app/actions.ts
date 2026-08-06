'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { profileService } from '@/core/profile/profile-service';
import { ACTIVE_PROFILE_COOKIE } from '@/core/profile/active-profile';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function switchProfileAction(profileId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_PROFILE_COOKIE, profileId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
  });
  revalidatePath('/', 'layout');
}

export async function createProfileAction(name: string): Promise<{ id: string }> {
  const id = await profileService.createProfile(name);
  await switchProfileAction(id);
  return { id };
}
