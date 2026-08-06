'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { applicationService } from '@/core/applications/application-service';
import { ApplicationOptionsSchema } from '@/shared/schemas/application';

const ApplicationIdSchema = z.uuid();

const CreateApplicationSchema = z.object({
  jobId: z.uuid(),
  options: ApplicationOptionsSchema,
});

export async function createApplicationAction(input: unknown): Promise<{ id: string }> {
  const { jobId, options } = CreateApplicationSchema.parse(input);
  const id = await applicationService.create(jobId, options);
  revalidatePath('/applications');
  return { id };
}

export async function updateApplicationOptionsAction(applicationId: string, input: unknown): Promise<void> {
  const id = ApplicationIdSchema.parse(applicationId);
  const options = ApplicationOptionsSchema.partial().parse(input);
  await applicationService.updateOptions(id, options);
  revalidatePath(`/applications/${id}`);
}

const UpdateContentSchema = z.object({
  cvContent: z.string().optional(),
  letterContent: z.string().optional(),
});

export async function updateApplicationContentAction(applicationId: string, input: unknown): Promise<void> {
  const id = ApplicationIdSchema.parse(applicationId);
  const patch = UpdateContentSchema.parse(input);
  await applicationService.updateContent(id, patch);
}

export async function regenerateApplicationContentAction(applicationId: string, instructions?: string): Promise<void> {
  const id = ApplicationIdSchema.parse(applicationId);
  await applicationService.regenerate(id, instructions);
  revalidatePath(`/applications/${id}`);
}

export async function deleteApplicationAction(applicationId: string): Promise<void> {
  const id = ApplicationIdSchema.parse(applicationId);
  await applicationService.delete(id);
  revalidatePath('/applications');
}
