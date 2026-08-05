import { notFound } from 'next/navigation';
import { applicationService } from '@/core/applications/application-service';
import { jobPostingService } from '@/core/jobs/jobposting-service';
import { layoutTemplateRegistry } from '@/core/applications/layout/registered-layouts';
import { profileService } from '@/core/profile/profile-service';
import { ApplicationDetailBody } from './application-detail-body';

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [application, profile] = await Promise.all([applicationService.getById(id), profileService.getActiveProfile()]);
  if (!application) {
    notFound();
  }

  const job = await jobPostingService.getById(application.jobId);

  const documentStyles = layoutTemplateRegistry
    .getById(application.layoutTemplate)
    .editorStyles(application.colorScheme, '.application-document');

  return (
    <ApplicationDetailBody
      applicationId={application.id}
      jobTitle={job.data.title}
      company={job.data.company}
      cvContent={application.cvContent}
      letterContent={application.letterContent}
      options={{
        tone: application.tone,
        personality: application.personality,
        language: application.language,
        colorScheme: application.colorScheme,
      }}
      generationStatus={application.generationStatus}
      pdfStatus={application.pdfStatus}
      profilePersonal={profile?.data?.personal ?? null}
      documentStyles={documentStyles}
    />
  );
}
