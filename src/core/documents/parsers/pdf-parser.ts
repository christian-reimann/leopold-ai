import { extractText, getDocumentProxy, renderPageAsImage } from 'unpdf';
import { visionTranscriber } from '@/llm/vision-extraction';
import type { DocumentParser } from './document-parser';

// Unterhalb dieser Zeichenzahl pro Seite gilt ein PDF als ohne Textlayer (Scan/Bild).
const MIN_TEXT_LENGTH_PER_PAGE = 20;
// Kostenschutz: verhindert unbegrenzt viele Vision-Calls für sehr lange Scans.
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

    // Kein (ausreichender) Textlayer gefunden: vermutlich gescanntes/bildbasiertes PDF.
    // Fallback macht diesen sonst kostenlosen, deterministischen Schritt bewusst
    // kostenpflichtig (Anthropic API) und nicht-deterministisch.
    if (totalPages > MAX_SCANNED_PDF_PAGES) {
      throw new Error(
        `Gescanntes PDF mit ${totalPages} Seiten überschreitet das Limit von ${MAX_SCANNED_PDF_PAGES} Seiten für Vision-Transkription`,
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
