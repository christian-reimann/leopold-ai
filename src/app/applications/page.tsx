import { applicationService } from '@/core/applications/application-service';
import { ApplicationsList } from './applications-list';

export default async function ApplicationsPage() {
  const rows = await applicationService.listAll();

  return (
    <ApplicationsList
      rows={rows.map(({ application, job }) => ({
        id: application.id,
        jobTitle: job.title,
        company: job.company,
        generationStatus: application.generationStatus,
        pdfStatus: application.pdfStatus,
      }))}
    />
  );
}
