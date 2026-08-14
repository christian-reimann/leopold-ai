import { cookies } from 'next/headers';
import { profileService } from './profile-service';

export const ACTIVE_PROFILE_COOKIE = 'active_profile_id';

/**
 * Liest niemals über einen Server-Component-Render hinweg (kein `cookies().set`, das ist dort
 * verboten) – falls das Cookie fehlt oder auf ein gelöschtes Profil zeigt, wird nur der Fallback
 * zurückgegeben, nicht persistiert. Persistiert wird ausschließlich über `switchProfileAction`.
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
    throw new Error('Kein Profil vorhanden');
  }
  return fallback.id;
}
