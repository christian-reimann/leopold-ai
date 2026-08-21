import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmbeddingClient } from '@/llm/embeddings';

describe('EmbeddingClient', () => {
  const client = new EmbeddingClient('http://ollama.test:11434');

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('embedTexts posts to /api/embed with the bge-m3 model and returns the embeddings', async () => {
    const embeddings = [
      [0.1, 0.2],
      [0.3, 0.4],
    ];
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ embeddings }), { status: 200 }),
    );

    const result = await client.embedTexts(['a', 'b']);

    expect(result).toEqual(embeddings);
    expect(fetch).toHaveBeenCalledWith(
      'http://ollama.test:11434/api/embed',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ model: 'bge-m3', input: ['a', 'b'] }),
      }),
    );
  });

  it('embedTexts returns an empty array without calling fetch when given no texts', async () => {
    const result = await client.embedTexts([]);
    expect(result).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('embedText returns the single embedding', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ embeddings: [[0.5, 0.6]] }), { status: 200 }),
    );
    expect(await client.embedText('a')).toEqual([0.5, 0.6]);
  });

  it('throws when Ollama responds with a non-ok status', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('boom', { status: 500 }));
    await expect(client.embedText('a')).rejects.toThrow(/Ollama embedding failed \(500\)/);
  });

  it('throws when Ollama returns no embedding for embedText', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ embeddings: [] }), { status: 200 }));
    await expect(client.embedText('a')).rejects.toThrow(/did not return an embedding/);
  });
});
