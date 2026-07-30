import { generateText, type LanguageModel } from 'ai';
import { chatModel } from './provider';

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp';

export class VisionTranscriber {
  constructor(private readonly model: LanguageModel = chatModel) {}

  async transcribeImage(image: Buffer, mediaType: ImageMediaType): Promise<string> {
    const { text } = await generateText({
      model: this.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Transkribiere den gesamten sichtbaren Text dieses Dokuments (Lebenslauf, Anschreiben oder Zertifikat) wortgetreu als Klartext. Gib ausschließlich den transkribierten Text zurück, ohne Kommentare oder Formatierungshinweise.',
            },
            { type: 'file', data: image, mediaType },
          ],
        },
      ],
    });

    return text;
  }
}

export const visionTranscriber = new VisionTranscriber();
