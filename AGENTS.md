This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Leopold is a job-search/application AI agent (German UI/domain, code and comments in
German): manage documents, extract profile data, find job postings via connectors,
score matches, and generate CVs/cover letters (rendered as PDF) — all steerable through
an app-wide chat agent with tool-calling. It's a learning project (RAG, agents, workflow
orchestration, structured output) intended for open-source release.

## Commands

```bash
pnpm db:up          # start Postgres+pgvector, Redis, Ollama (docker compose)
pnpm db:migrate      # apply Drizzle migrations
pnpm db:generate     # generate a migration after editing src/db/schema/*.ts
pnpm db:studio       # Drizzle Studio

pnpm dev             # Next.js dev server
pnpm worker:dev      # BullMQ worker (tsx watch) — runs as a separate process from the app

pnpm lint            # eslint . (includes the module-boundary rules, see below)
pnpm typecheck       # tsc --noEmit
pnpm format          # prettier --write .
pnpm format:check
```

No test suite exists in this repo currently.

One-time setup: `docker exec -it $(docker compose ps -q ollama) ollama pull bge-m3`
(embedding model) and `.env` populated from `.env.example` (needs at least
`ANTHROPIC_API_KEY`).

## Architecture

### App and worker only talk through DB + queue

The Next.js app and the BullMQ worker are **separate runtime processes** and must
**never** call each other directly. The app enqueues jobs (`queue.enqueueX(...)`); the
worker processes them and writes results/status to Postgres; the app reads results back
from the DB (polling where needed). Never run heavy work (scraping, embedding, LLM
generation) inside a Server Action / request cycle — it belongs in the queue, processed
by `src/worker/*-worker.ts`.

### Modular monolith enforced by ESLint, not physical packages

Single pnpm package (no workspaces). Module boundaries between `src/*` folders are
enforced at lint time via `import/no-restricted-paths` in `eslint.config.js`
(`pnpm lint` will fail on violations):

- `shared` — importable by everyone, imports nothing else in `src/`
- `db` — no imports from `llm`, `connectors`, `core`, `worker`, `app`
- `llm` — no imports from `db`, `connectors`, `core`, `worker`, `app`
- `connectors` — no imports from `db`, `llm`, `core`, `worker`, `app`
- `core` — no imports from `connectors`, `worker`, `app` (may import `db`, `llm`, `shared`)
- `worker` — no imports from `app`
- `app` — no imports from `llm`, `connectors`, `worker`, `db` (goes through `core`)

Practical implication: agent tools live under `src/core/agent/` (not `src/llm/agent/`)
because the agent orchestrates `core/` services and `llm/ → core/` is a forbidden
direction. Domain services in `core/` are the only place allowed to reach into both
`db/` and `llm/`.

### Folder map

- `src/app/` — Next.js App Router: pages, Server Actions, thin `app/api/*` route
  handlers (only for real HTTP endpoints like webhooks/PDF streaming, not as the
  standard data path)
- `src/worker/` — BullMQ worker processes (`runner.ts` boots one process running
  `DocumentWorker`, `JobSearchWorker`, `ApplicationWorker`)
- `src/core/` — domain logic: services, the agent, matching, applications, queue
  wrappers, document parsing
- `src/db/` — Drizzle schema (`src/db/schema/*.ts`) + client
- `src/llm/` — provider abstraction (`provider.ts`, the only file that knows the
  concrete Anthropic provider), embeddings (Ollama), structured-output extractors,
  match judge
- `src/connectors/` — job-board adapters (Arbeitsagentur, Arbeitnow, get-in-it,
  Kimeta), all implementing `JobConnector`, registered in `registry.ts`
- `src/shared/` — Zod schemas and types used across boundaries

### Code style: OOP outside the frontend

`core/`, `connectors/`, `llm/`, `worker/` are object-oriented: services, strategies and
registries as classes, not loose function collections. Established patterns:

- **Strategy + Registry** for swappable implementations — `connectors/registry.ts`,
  `core/documents/parsers/parser-registry.ts`, `core/applications/layout/layout-registry.ts`.
  Registries throw on duplicate registration and on lookup-miss-by-id.
- **Template Method** for shared flow with varying steps — `JobQueue` (base class in
  `core/queue/job-queue.ts`, concrete queues add named `enqueueX` methods instead of
  exposing the generic `enqueue` API), `*Worker` classes.
- **Singleton service instances** for logic without variants —
  `export const xyzService = new XyzService();` (e.g. `documentService`,
  `matchingService`, `profileService`).
- Instance methods that don't touch `this` are `private`.

**Exception:** `src/app/` (Next.js) stays functional/idiomatic Next.js — Server Actions
are plain `async function`s that call into `core/` services, not classes.

### Next.js style — deliberately "lean, server-first"

- Reads: directly in `async` Server Components with direct Drizzle DB access. No
  route-handler + client-`fetch` + query-library layer for internal data.
- Writes: Server Actions (`"use server"`), Zod-validated at the top.
- `"use client"` only where real interactivity is needed (TipTap editor, dropzone
  upload, live status polling).
- Route handlers (`app/api/.../route.ts`) only for genuine HTTP endpoints (PDF
  streaming, webhooks).
- `revalidatePath`/caching is the trickiest part — reason about it explicitly.

### Agent (`src/core/agent/`)

`AgentService.streamChat` (`agent-service.ts`) runs `streamText` with
`stopWhen: stepCountIs(8)`, tools from `buildAgentTools(profileId)`
(`tool-registry.ts`) which merges per-domain tool sets (`tools/*-tools.ts`). Destructive
tools (`DESTRUCTIVE_TOOL_NAMES`: `deleteDocument`, `deleteSearchQuery`,
`deleteApplication`) are routed through AI SDK's `toolApproval: 'user-approval'` —
the stream pauses for explicit UI confirmation before executing. Two conversation
scopes exist: one global conversation and one per-application conversation
(`conversations`/`messages` tables); `AgentPanel` picks the scope from the route via
`usePathname()`.

`profileId` for agent tools/workers is resolved from the entity/conversation being
acted on, not read from the active-profile cookie — this avoids cross-profile writes if
the user switches the active profile while a background job is in flight.

### Multi-profile

No auth system. The active profile is cookie-based (`ACTIVE_PROFILE_COOKIE`,
`src/core/profile/active-profile.ts`) and switchable via a header dropdown
(`profile-switcher.tsx`). `getActiveProfileId()` never persists inside a Server
Component render (`cookies().set` is disallowed there) — persisting only happens
through `switchProfileAction`.

### RAG boundaries (don't reach for RAG reflexively)

- Profile extraction from uploaded documents: **no RAG** — plain structured extraction
  (`generateObject` + Zod, `src/llm/profile-extraction.ts`).
- Job↔profile matching: embeddings are a **pre-filter only**
  (`MATCH_VORFILTER_SIMILARITY_THRESHOLD` cosine cutoff in
  `core/matching/matching-service.ts`), then an LLM-as-judge (`src/llm/match-judge.ts`)
  produces the actual `scoreMeToJob` + reasoning. Cosine similarity alone is not the
  score.
- Application generation: **real RAG** — cosine search over `document_chunks`
  (`src/core/documents/search-chunks.ts`) feeds CV/letter generation.

### Other conventions worth knowing

- pgvector cosine distance via Drizzle's `cosineDistance()`: the `<=>` operator binds
  looser than arithmetic operators, so `1 - cosineDistance(...)` needs explicit
  parens or Postgres throws a type error.
- PDF export renders the same TipTap-produced HTML both for editor preview
  (`<iframe srcDoc>`) and for the Puppeteer PDF export — true WYSIWYG; layout is fixed
  per layout template (`src/core/applications/layout/`, Strategy+Registry).
- Local file storage under `storage/` (uploads, chat uploads, generated application
  PDFs) — no S3/object storage.
- Most of the app is a deterministic workflow (find → dedup → classify → score →
  persist) implemented as plain TS, not agent decision-making; the chat agent is the
  one place with genuine multi-step tool-calling autonomy.
