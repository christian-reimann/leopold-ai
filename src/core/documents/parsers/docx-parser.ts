import mammoth from 'mammoth';
import type { DocumentParser } from './document-parser';

export class DocxParser implements DocumentParser {
  supports(extension: string): boolean {
    return extension === '.docx';
  }

  async parse(buffer: Buffer): Promise<string> {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
}
