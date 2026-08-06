import { documentService } from '@/core/documents/document-service';
import { getActiveProfileId } from '@/core/profile/active-profile';
import { profileService } from '@/core/profile/profile-service';
import type { Profile } from '@/shared/schemas/profile';
import { ProfilePageBody } from './profile-page-body';

const EMPTY_PROFILE: Profile = {
  personal: {
    name: '',
    role: '',
    address: { street: '', zipcode: '', location: '', country: '' },
    contact: { email: '', phone: '' },
  },
  education: [],
  experiences: [],
  projects: [],
  skills: [],
  strengths: [],
  languages: [],
  interests: [],
};

export default async function ProfilePage() {
  const profileId = await getActiveProfileId();
  const [profile, docs] = await Promise.all([profileService.getProfile(profileId), documentService.listAll(profileId)]);
  const hasPendingDocs = docs.some(
    (doc) =>
      doc.status === 'pending' ||
      doc.status === 'processing' ||
      (doc.status === 'done' && (doc.embeddingStatus === 'pending' || doc.embeddingStatus === 'processing')),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Mein Profil</h1>
      <ProfilePageBody
        hasProfile={Boolean(profile)}
        profile={profile?.data ?? EMPTY_PROFILE}
        profileStatus={profile?.status ?? null}
        profileError={profile?.error ?? null}
        docs={docs.map((doc) => ({
          id: doc.id,
          name: doc.originalFilename,
          type: doc.type,
          status: doc.status,
          error: doc.error,
          embeddingStatus: doc.embeddingStatus,
          embeddingError: doc.embeddingError,
        }))}
        hasPendingDocs={hasPendingDocs}
      />
    </div>
  );
}
