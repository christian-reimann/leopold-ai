/**
 * Embedding model choice (§7 in the project plan): bge-m3, 1024 dimensions.
 * Runs locally via Ollama, good multilingual/German quality, matches the
 * `EMBEDDING_DIMENSIONS` default in the DB schema (@/db/constants).
 *
 * Ollama is deliberately not wired up through the AI SDK provider abstraction:
 * for a single local embedding endpoint, a lean direct call to the native
 * Ollama API is easier to read than an additional provider dependency.
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
      throw new Error('Ollama did not return an embedding');
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
      throw new Error(`Ollama embedding failed (${response.status}): ${await response.text()}`);
    }

    const { embeddings } = (await response.json()) as OllamaEmbedResponse;
    return embeddings;
  }
}

export const embeddingClient = new EmbeddingClient();
