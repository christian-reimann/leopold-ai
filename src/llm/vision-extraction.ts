import { generateText } from 'ai';
import { chatModel } from './provider';

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp';

export async function transcribeImage(image: Buffer, mediaType: ImageMediaType): Promise<string> {
  const { text } = await generateText({
    model: chatModel,
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
