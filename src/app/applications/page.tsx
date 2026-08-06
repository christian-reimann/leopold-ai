import { applicationService } from '@/core/applications/application-service';
import { getActiveProfileId } from '@/core/profile/active-profile';
import { ApplicationsList } from './applications-list';

export default async function ApplicationsPage() {
  const profileId = await getActiveProfileId();
  const rows = await applicationService.listAll(profileId);

  return (
    <ApplicationsList
      rows={rows.map(({ application, job }) => ({
        id: application.id,
        jobTitle: job.title,
        company: job.company,
        generationStatus: application.generationStatus,
      }))}
    />
  );
}
