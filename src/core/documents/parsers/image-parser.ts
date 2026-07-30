import { visionTranscriber, type ImageMediaType } from '@/llm/vision-extraction';
import type { DocumentParser } from './document-parser';

const MEDIA_TYPE_BY_EXTENSION: Record<string, ImageMediaType> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export class ImageParser implements DocumentParser {
  supports(extension: string): boolean {
    return extension in MEDIA_TYPE_BY_EXTENSION;
  }

  async parse(buffer: Buffer, extension: string): Promise<string> {
    const mediaType = MEDIA_TYPE_BY_EXTENSION[extension];
    if (!mediaType) {
      throw new Error(`Nicht unterstütztes Bildformat: ${extension}`);
    }
    return visionTranscriber.transcribeImage(buffer, mediaType);
  }
}
