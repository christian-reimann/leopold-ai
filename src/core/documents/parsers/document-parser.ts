export interface DocumentParser {
  supports(extension: string): boolean;
  parse(buffer: Buffer, extension: string): Promise<string>;
}
