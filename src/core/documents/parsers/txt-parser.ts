import type { DocumentParser } from './document-parser';

export class TxtParser implements DocumentParser {
  supports(extension: string): boolean {
    return extension === '.txt';
  }

  async parse(buffer: Buffer): Promise<string> {
    return buffer.toString('utf-8');
  }
}
