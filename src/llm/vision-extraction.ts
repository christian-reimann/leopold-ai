import { generateText, type LanguageModel } from 'ai';
import { chatModel } from './provider';

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp';

export class VisionTranscriber {
  constructor(private readonly model: LanguageModel = chatModel) {}

  async transcribeImage(image: Buffer, mediaType: ImageMediaType): Promise<string> {
    const context = `Bildtranskription (${mediaType}, ${image.length} Bytes)`;
    console.log(`[${new Date().toISOString()}] [llm:vision-extraction] Gestartet: ${context}`);
    const start = Date.now();

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

    console.log(
      `[${new Date().toISOString()}] [llm:vision-extraction] Abgeschlossen: ${context} (${text.length} Zeichen, ${Date.now() - start}ms)`,
    );
    return text;
  }
}

export const visionTranscriber = new VisionTranscriber();
