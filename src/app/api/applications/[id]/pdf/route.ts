import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { applicationService } from '@/core/applications/application-service';

const ApplicationIdSchema = z.uuid();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const applicationId = ApplicationIdSchema.parse(id);

  const application = await applicationService.getById(applicationId);
  if (!application.pdfPath) {
    return new Response('PDF wurde noch nicht erstellt', { status: 404 });
  }

  const buffer = await readFile(path.resolve(application.pdfPath));
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bewerbung-${applicationId}.pdf"`,
    },
  });
}
