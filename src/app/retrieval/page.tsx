import { SearchForm } from './search-form';

export default function RetrievalPage() {
  return (
    <div className="space-y-4">
      <section>
        <h1 className="mb-1 text-lg font-semibold">Retrieval-Test</h1>
        <p className="text-sm text-neutral-500">
          Testet die Ähnlichkeitssuche über die eingebetteten Dokument-Chunks (RAG-Grundlage, siehe Projektplan §6/§8
          Phase 2). Die Eingabe wird mit demselben Embedding-Modell (bge-m3) codiert wie die Dokumente und per
          Cosine-Similarity gegen <code>document_chunks</code> verglichen.
        </p>
      </section>
      <SearchForm />
    </div>
  );
}
