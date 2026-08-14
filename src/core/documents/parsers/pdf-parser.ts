import { extractText, getDocumentProxy, renderPageAsImage } from 'unpdf';
import { visionTranscriber } from '@/llm/vision-extraction';
import type { DocumentParser } from './document-parser';

// Below this character count per page, a PDF is considered to have no text layer (scan/image).
const MIN_TEXT_LENGTH_PER_PAGE = 20;
// Cost guard: prevents unbounded Vision calls for very long scans.
const MAX_SCANNED_PDF_PAGES = 10;

type PdfProxy = Awaited<ReturnType<typeof getDocumentProxy>>;

export class PdfParser implements DocumentParser {
  supports(extension: string): boolean {
    return extension === '.pdf';
  }

  async parse(buffer: Buffer): Promise<string> {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text, totalPages } = await extractText(pdf, { mergePages: true });

    if (text.trim().length >= MIN_TEXT_LENGTH_PER_PAGE * totalPages) {
      return text;
    }

    // No (sufficient) text layer found: likely a scanned/image-based PDF.
    // The fallback deliberately turns this otherwise free, deterministic step into a
    // paid (Anthropic API) and non-deterministic one.
    if (totalPages > MAX_SCANNED_PDF_PAGES) {
      throw new Error(
        `Scanned PDF with ${totalPages} pages exceeds the limit of ${MAX_SCANNED_PDF_PAGES} pages for vision transcription`,
      );
    }

    return this.transcribeScannedPages(pdf, totalPages);
  }

  private async transcribeScannedPages(pdf: PdfProxy, totalPages: number): Promise<string> {
    const pageTexts: string[] = [];
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      const png = await renderPageAsImage(pdf, pageNumber, {
        canvasImport: () => import('@napi-rs/canvas'),
      });
      pageTexts.push(await visionTranscriber.transcribeImage(Buffer.from(png), 'image/png'));
    }
    return pageTexts.join('\n\n');
  }
}
