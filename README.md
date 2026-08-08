# Leopold

Leopold ist ein KI-Agent zur Unterstützung bei Jobsuche und Bewerbung: Dokumente
verwalten, Profildaten extrahieren, Jobangebote automatisch finden und per
LLM-Matching bewerten, Bewerbungen (Lebenslauf + Anschreiben) generieren und als
PDF exportieren – gesteuert über einen app-weiten Chat-Agenten mit Tool-Calling.

Entstanden als Lernprojekt für KI-Agenten, Workflows, RAG und LLMs. Den vollen
Kontext zu Architektur- und Stack-Entscheidungen (inkl. Begründungen) gibt es in
[LEOPOLD-PROJEKTPLAN.md](./LEOPOLD-PROJEKTPLAN.md).

## Tech-Stack

- **Next.js** (App Router, server-first) + **TypeScript**
- **PostgreSQL + pgvector** (Daten & Vektor-Suche in einer DB), **Drizzle** als ORM
- **BullMQ (Redis)** für Hintergrundjobs (Scraping, Embedding, Matching, PDF-Export)
- **Ollama** (lokal, `bge-m3`) für Embeddings, **Claude** (via Vercel AI SDK) für
  Generierung, Extraktion und den Agenten-Chat
- **TipTap** (WYSIWYG-Editor), **Puppeteer** (HTML→PDF), **Playwright**
  (Scraping-Connectors)

## Setup

Voraussetzungen: Node (siehe `.nvmrc`), pnpm, Docker.

```bash
pnpm install

# Postgres, Redis, Ollama starten
pnpm db:up

# Embedding-Modell einmalig in Ollama laden
docker exec -it $(docker compose ps -q ollama) ollama pull bge-m3

cp .env.example .env
# .env ausfüllen: mindestens ANTHROPIC_API_KEY

pnpm db:migrate
```

`.env`-Variablen sind in `.env.example` dokumentiert.

## Entwicklung

```bash
pnpm dev           # Next.js Dev-Server
pnpm worker:dev     # BullMQ-Worker (Scraping, Embedding, Matching, PDF-Export)
```

Beide Prozesse laufen unabhängig voneinander und kommunizieren ausschließlich
über Datenbank und Queue (siehe Projektplan, §4).

Weitere Befehle: `pnpm lint`, `pnpm typecheck`, `pnpm format`, `pnpm db:studio`
(Drizzle Studio).

## Lizenz

[MIT](./LICENSE)
