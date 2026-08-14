# Leopold

Leopold is an AI agent for job search and application support: manage documents,
extract profile data, automatically find job postings and score them via LLM
matching, generate applications (CV + cover letter) and export them as PDF –
all steerable through an app-wide chat agent with tool-calling.

Built as a learning project for AI agents, workflows, RAG and LLMs.

## Tech Stack

- **Next.js** (App Router, server-first) + **TypeScript**
- **PostgreSQL + pgvector** (data & vector search in one DB), **Drizzle** as ORM
- **BullMQ (Redis)** for background jobs (scraping, embedding, matching, PDF export)
- **Ollama** (local, `bge-m3`) for embeddings, **Claude** (via Vercel AI SDK) for
  generation, extraction and the agent chat
- **TipTap** (WYSIWYG editor), **Puppeteer** (HTML→PDF), **Playwright**
  (scraping connectors)

## Setup

Prerequisites: Node (see `.nvmrc`), pnpm, Docker.

```bash
pnpm install

# Start Postgres, Redis, Ollama
pnpm db:up

# Load the embedding model into Ollama once
docker exec -it $(docker compose ps -q ollama) ollama pull bge-m3

cp .env.example .env
# fill in .env: at minimum ANTHROPIC_API_KEY

pnpm db:migrate
```

`.env` variables are documented in `.env.example`.

## Development

```bash
pnpm dev           # Next.js dev server
pnpm worker:dev     # BullMQ worker (scraping, embedding, matching, PDF export)
```

Both processes run independently and communicate exclusively via the
database and queue (see project plan, §4).

More commands: `pnpm lint`, `pnpm typecheck`, `pnpm format`, `pnpm db:studio`
(Drizzle Studio).

## License

[MIT](./LICENSE)
