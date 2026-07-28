/**
 * Chunking-Strategie (§7 im Projektplan): Bewerbungsunterlagen sind kurz und
 * bereits strukturiert (Absätze, Abschnitte), daher genügt ein einfaches
 * absatzbasiertes Packen bis zu einer Zielgröße – kein naives Fixed-Size-
 * Splitten mitten im Satz, kein Overlap nötig (Absätze sind bereits in sich
 * abgeschlossene Sinneinheiten).
 */
const TARGET_CHUNK_CHARS = 1500;

export function chunkText(text: string): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

    if (candidate.length > TARGET_CHUNK_CHARS && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = candidate;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}
