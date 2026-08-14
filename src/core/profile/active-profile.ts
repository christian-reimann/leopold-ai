import { cookies } from 'next/headers';
import { profileService } from './profile-service';

export const ACTIVE_PROFILE_COOKIE = 'active_profile_id';

/**
 * Never persists across a Server Component render (no `cookies().set`, which is forbidden
 * there) – if the cookie is missing or points to a deleted profile, only the fallback is
 * returned, not persisted. Persisting happens exclusively via `switchProfileAction`.
 */
export async function getActiveProfileId(): Promise<string> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ACTIVE_PROFILE_COOKIE)?.value;

  if (cookieValue) {
    const profile = await profileService.getProfile(cookieValue);
    if (profile) {
      return profile.id;
    }
  }

  const allProfiles = await profileService.listProfiles();
  let fallback = allProfiles[0];
  if (!fallback) {
    await profileService.ensureAtLeastOneProfile();
    [fallback] = await profileService.listProfiles();
  }
  if (!fallback) {
    throw new Error('No profile available');
  }
  return fallback.id;
}
