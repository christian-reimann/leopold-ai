import { DocxParser } from './docx-parser';
import { ImageParser } from './image-parser';
import { ParserRegistry } from './parser-registry';
import { PdfParser } from './pdf-parser';
import { TxtParser } from './txt-parser';

export const parserRegistry = new ParserRegistry([
  new PdfParser(),
  new DocxParser(),
  new TxtParser(),
  new ImageParser(),
]);
