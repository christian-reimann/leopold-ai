import { notFound, redirect } from 'next/navigation';
import { applicationService } from '@/core/applications/application-service';
import { jobPostingService } from '@/core/jobs/jobposting-service';
import { layoutTemplateRegistry } from '@/core/applications/layout/registered-layouts';
import { getActiveProfileId } from '@/core/profile/active-profile';
import { profileService } from '@/core/profile/profile-service';
import { ApplicationDetailBody } from './application-detail-body';

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [application, activeProfileId] = await Promise.all([applicationService.findById(id), getActiveProfileId()]);
  if (!application) {
    notFound();
  }
  if (application.profileId !== activeProfileId) {
    redirect('/applications');
  }

  const [job, profile] = await Promise.all([
    jobPostingService.getById(application.jobId),
    profileService.getProfile(application.profileId),
  ]);

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
      profilePersonal={profile?.data?.personal ?? null}
      documentStyles={documentStyles}
    />
  );
}
