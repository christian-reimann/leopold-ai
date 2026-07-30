import { profileService } from '@/core/profile/profile-service';
import type { Profile } from '@/shared/schemas/profile';
import { ProfileForm } from './profile-form';

const EMPTY_PROFILE: Profile = {
  name: '',
  role: '',
  address: { street: '', zipcode: '', location: '', country: '' },
  contact: { email: '', phone: '' },
  education: [],
  experiences: [],
  projects: [],
  skills: [],
  strengths: [],
  languages: [],
  interests: [],
};

export default async function ProfilePage() {
  const profile = await profileService.getActiveProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Profil</h1>
        {!profile && (
          <p className="text-sm text-neutral-500">
            Noch kein Profil vorhanden – unter Dokumente aus einem Dokument extrahieren oder unten manuell anlegen.
          </p>
        )}
      </div>
      <ProfileForm profileId={profile?.id} profile={profile?.data ?? EMPTY_PROFILE} />
    </div>
  );
}
