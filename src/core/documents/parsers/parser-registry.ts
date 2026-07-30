import type { DocumentParser } from './document-parser';

export class ParserRegistry {
  constructor(private readonly parsers: DocumentParser[]) {}

  isSupported(extension: string): boolean {
    return this.findParser(extension) !== undefined;
  }

  async parse(buffer: Buffer, extension: string): Promise<string> {
    const parser = this.findParser(extension);
    if (!parser) {
      throw new Error(`Nicht unterstütztes Dateiformat: ${extension}`);
    }
    return parser.parse(buffer, extension);
  }

  private findParser(extension: string): DocumentParser | undefined {
    return this.parsers.find((parser) => parser.supports(extension));
  }
}
