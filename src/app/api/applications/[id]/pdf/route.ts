import { z } from 'zod';
import { applicationService } from '@/core/applications/application-service';

const ApplicationIdSchema = z.uuid();
const DocTypeSchema = z.enum(['cv', 'letter']);
const DOC_TYPE_FILENAME_LABELS = { cv: 'lebenslauf', letter: 'anschreiben' } as const;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const applicationId = ApplicationIdSchema.parse(id);
  const docType = DocTypeSchema.parse(new URL(request.url).searchParams.get('doc'));

  const pdf = await applicationService.renderPdfBuffer(applicationId, docType);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${DOC_TYPE_FILENAME_LABELS[docType]}-${applicationId}.pdf"`,
    },
  });
}
