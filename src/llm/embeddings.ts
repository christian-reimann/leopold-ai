/**
 * Embedding-Modellwahl (§7 im Projektplan): bge-m3, 1024 Dimensionen.
 * Läuft lokal über Ollama, gute mehrsprachige/deutsche Qualität, passt zum
 * `EMBEDDING_DIMENSIONS`-Default im DB-Schema (@/db/constants).
 *
 * Ollama wird bewusst nicht über die AI-SDK-Provider-Abstraktion angebunden:
 * für einen einzelnen lokalen Embedding-Endpunkt ist ein schlanker direkter
 * Aufruf der nativen Ollama-API einfacher zu lesen als eine zusätzliche
 * Provider-Dependency.
 */
const DEFAULT_BASE_URL = 'http://localhost:11434';
const EMBEDDING_MODEL = 'bge-m3';

interface OllamaEmbedResponse {
  embeddings: number[][];
}

export class EmbeddingClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }
    return this.callOllamaEmbed(texts);
  }

  async embedText(text: string): Promise<number[]> {
    const [embedding] = await this.callOllamaEmbed([text]);
    if (!embedding) {
      throw new Error('Ollama hat kein Embedding zurückgegeben');
    }
    return embedding;
  }

  private async callOllamaEmbed(input: string[]): Promise<number[][]> {
    const response = await fetch(`${this.baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
    });

    if (!response.ok) {
      throw new Error(`Ollama-Embedding fehlgeschlagen (${response.status}): ${await response.text()}`);
    }

    const { embeddings } = (await response.json()) as OllamaEmbedResponse;
    return embeddings;
  }
}

export const embeddingClient = new EmbeddingClient();
