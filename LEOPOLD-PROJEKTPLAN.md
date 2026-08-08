# Leopold – Projektplan & Kontext-Briefing

> **Zweck dieses Dokuments:** Kontext-Briefing für die Weiterarbeit in Claude Code.
> Es hält alle bisher getroffenen Stack- und Architekturentscheidungen fest –
> **inklusive der Begründungen**, damit die Entscheidungen nachvollziehbar bleiben
> und nicht versehentlich revidiert werden.

---

## 1. Projektüberblick

**Leopold** ist ein KI-Agent zur Unterstützung bei Jobsuche und Bewerbung.

**Primäres Ziel des Projekts:** Lernen von KI-Agenten, Workflows, RAG und LLMs.
Das Projekt soll nach Abschluss **als Open Source** veröffentlicht werden.

**Wichtige Rahmenbedingungen:**

- **Kein Python.** Durchgängig TypeScript.
- Entwickler hat **TypeScript-Grundlagen**, aber noch kein großes Projekt umgesetzt.
- LLM-Nutzung: **Mix** – Paid-LLMs (Claude/GPT) für Generierung ok, lokal (Ollama)
  wo sinnvoll, v.a. für Embeddings.
- Code-Präferenz: **möglichst elegant und schlank**, nichts Verstecktes
  (wichtig, weil andere den Open-Source-Code lesen sollen).

**Lernprioritäten (in dieser Reihenfolge):**

1. RAG / Vektor-Suche
2. Agenten & Tool-Calling
3. Workflow-Orchestrierung
4. LLM-Prompting & Structured Output

---

## 2. Feature-Anforderungen (aus der ursprünglichen Idee)

1. **Workspace** zur Verwaltung zentraler Inhalte:
   - Upload von Bewerbungsschreiben, Lebensläufen, Zertifikaten (u.a. Drag-and-Drop)
   - Profildaten (aus Dokumenten extrahiert **oder** manuell eingegeben)
   - Suchaufträge
   - Jobangebote
   - Bewerbungen
2. **Automatische Job-Findung:** finden → deduplizieren → vorfiltern → klassifizieren
   → Matching-Scores berechnen (bidirektional) → persistieren
3. **Bewerbung erstellen** für ein konkretes Jobangebot: Lebenslauf + Motivationsschreiben
   auf Basis von Profildaten, Suchprofil und Jobinserat vorbereiten; Änderungen per
   WYSIWYG; am Ende **PDF-Export**
4. **Standardisierte Schnittstelle** zu Jobbörsen (öffentliche API, Bezahl-APIs,
   Scraping via Playwright)
5. **Benachrichtigungen** über neue Jobangebote in konfigurierbaren Intervallen
   (z.B. sofort, einmal täglich)

---

## 3. Tech-Stack (entschieden)

| Bereich                  | Wahl                                                                | Begründung                                                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sprache/Runtime          | **TypeScript**, Node.js 22+                                         | Kein Python gewünscht; reifes JS/TS-Ökosystem für LLM/RAG                                                                                                                 |
| Frontend + API           | **Next.js (App Router)**, **server-first / schlanke Variante**      | Marktrelevant, integriert, viel Lernmaterial. Bewusst als **zusätzliches Lernziel** gewählt. Stil: Server Components + Server Actions, minimales Boilerplate (Details §6) |
| WYSIWYG-Editor           | **TipTap** (ProseMirror-basiert)                                    | Ideal für strukturierte Dokumente (Lebenslauf/Anschreiben)                                                                                                                |
| Upload                   | **react-dropzone**                                                  | Drag-and-Drop                                                                                                                                                             |
| UI                       | **shadcn/ui + Tailwind**                                            | Schlank, verbreitet                                                                                                                                                       |
| Worker                   | **Eigenständiger Node-Prozess**                                     | Trennt schwere Logik (Scraping, Embedding, Matching) vom Web-Request-Zyklus                                                                                               |
| Queue/Scheduling         | **BullMQ (Redis)**                                                  | Wiederkehrende Suchaufträge, Benachrichtigungsintervalle (Repeatable Jobs)                                                                                                |
| DB + Vektoren            | **PostgreSQL + pgvector**                                           | Eine DB für relationale Daten **und** RAG – keine separate Vektor-DB nötig                                                                                                |
| ORM                      | **Drizzle**                                                         | TypeScript-nativ, schlank, explizit                                                                                                                                       |
| Validierung / Schemas    | **Zod**                                                             | Laufzeit-Validierung + abgeleitete TS-Typen; Basis für Structured Output                                                                                                  |
| LLM-Schicht              | **Vercel AI SDK**                                                   | Schlanke, typisierte Primitive (Tool-Calling, `generateObject`), Provider-Abstraktion                                                                                     |
| Embeddings               | **Ollama, lokal** (z.B. `bge-m3` / `nomic-embed-text`)              | Kostenlos, deutschtauglich (Modellwahl noch offen, siehe §7)                                                                                                              |
| Generierung              | **Claude / GPT** (via AI SDK)                                       | Beste Qualität für Anschreiben/Extraktion                                                                                                                                 |
| Agenten-Orchestrierung   | **AI SDK zuerst**, **LangGraph.js gezielt später**                  | Erst Primitive verstehen, Framework nur wo echter Mehrwert                                                                                                                |
| Scraping                 | **Playwright**                                                      | Exzellente Node-Bindings, kein Python                                                                                                                                     |
| PDF-Export               | **react-pdf** oder **Puppeteer**                                    | Deklarativ (react-pdf) oder HTML→PDF (Puppeteer)                                                                                                                          |
| Paketmanager             | **pnpm** (ein einziges Package, keine Workspaces)                   | Siehe „Modularer Monolith statt Multi-Package-Monorepo" unten                                                                                                             |
| Grenzen zwischen Modulen | **ESLint (`import/no-restricted-paths`)** statt physischer Packages | Erzwingt Abhängigkeitsrichtung zur Lint-Zeit, ohne `workspace:*`-Overhead                                                                                                 |

### Bewusst NICHT gewählt

- **LangChain.js** – zu viele Abstraktionsebenen, verschleiert die Konzepte
  (Gefahr: „Framework lernen statt Problem lösen").
- **Mastra** – interessant, aber jung; für ein Lernprojekt lenkt „batteries-included"
  vom Verständnis der rohen Konzepte ab. Zum Anschauen ok, nicht als Fundament.
- **Vite + Hono statt Next.js** – war die schlankere/explizitere Alternative, wurde
  aber zugunsten von Next.js verworfen, weil Next.js **bewusst als Skill mitgelernt**
  werden soll.

---

## 4. Architektur

### Grundprinzip (WICHTIGSTE REGEL)

Die **Next.js-App** und der **Worker** kommunizieren **NICHT direkt** miteinander.
Ihre Schnittstelle sind **Datenbank** und **Queue**:

- App legt Jobs in die Queue (`queue.add(...)`)
- Worker arbeitet sie ab und schreibt Ergebnisse/Status in die DB
- App liest Ergebnisse/Status wieder aus der DB (ggf. via Polling)

Das hält beide Teile entkoppelt. **Niemals** schwere Arbeit (Embedding, Scraping)
in einer Server Action / im Request-Zyklus laufen lassen – das gehört in die Queue.

### Struktur

```
mortimer/
├── src/
│   ├── app/            → Next.js (UI + dünne API-Schicht)
│   ├── worker/         → BullMQ-Worker (Agenten, Scraper, Pipelines)
│   ├── core/           → Domänenlogik, Workflows, Agenten
│   ├── db/             → Drizzle-Schema + Migrationen
│   ├── llm/            → Provider-Abstraktion, Embeddings, RAG
│   ├── connectors/     → Jobbörsen-Adapter (einheitliche Schnittstelle)
│   └── shared/         → Zod-Schemas, Typen, Utils (von allen genutzt)
├── drizzle/            → generierte SQL-Migrationen
├── docker-compose.yml  → Postgres+pgvector, Redis, Ollama
├── eslint.config.js    → erzwingt die Abhängigkeitsrichtung zwischen den Ordnern
└── package.json        → ein einziges Package, keine Workspaces
```

### Modularer Monolith statt Multi-Package-Monorepo

`app` und `worker` sind weiterhin zwei getrennte **Laufzeitprozesse** (siehe Grundprinzip
oben) – aber kein Multi-Package-Monorepo mehr. Ursprünglich war dafür ein
pnpm-Workspace mit physisch getrennten Packages (`apps/*`, `packages/*`) geplant.
Bewusst verworfen zugunsten von **einem Package mit Ordnerstruktur + ESLint-Grenzen**:

- `import/no-restricted-paths` erzwingt zur Lint-Zeit dieselbe Abhängigkeitsrichtung,
  die vorher Packages erzwungen hätten (z.B. `shared` darf nichts anderes importieren,
  `app` darf nicht direkt `llm`/`connectors`/`worker` importieren).
- Kein `workspace:*`, kein verschachteltes `node_modules`, kein `pnpm-workspace.yaml` –
  weniger Tooling-Overhead für ein Lernprojekt, dessen Lernziele RAG/Agenten/Workflows
  sind, nicht Monorepo-Tooling.
- Trade-off: die Grenze ist damit **Konvention + Lint**, nicht physisch/zur Install-Zeit
  erzwungen. Für ein Open-Source-Lernprojekt akzeptiert; bei echtem Bedarf (z.B.
  getrenntes Deployment mit unterschiedlichen Dependency-Bäumen) lässt sich einzelnes
  `src/*` später wieder in ein eigenes Package extrahieren.
- **Keine vorzeitige Microservice-Zersplitterung.**

---

## 5. Datenmodell (Postgres + pgvector, via Drizzle)

Grobe Tabellenübersicht (verfeinern in Claude Code):

- `documents` – hochgeladene Dateien: typ, storage_path, extrahierter_text, status
- `document_chunks` – Text-Chunks + `embedding` (vector) – für RAG
- `profiles` – strukturierte Profildaten (JSONB: Skills, Erfahrung, Ausbildung),
  Quelle: extrahiert | manuell
- `search_queries` – Suchaufträge: Kriterien, Intervall (instant|daily), aktiv?
- `job_postings` – Inserate: `dedupe_hash` (unique), raw_html, strukturierte Felder
  (JSONB), `embedding` (vector), source_connector
- `matches` – Verknüpfung job ↔ search_query: `score_job_to_me`, `score_me_to_job`,
  `reasoning` (JSONB)
- `applications` – erstellte Bewerbungen: job_id, cv_content, letter_content, status,
  pdf_path

---

## 6. Wichtige konzeptionelle Leitplanken

Diese Einsichten sind zentral fürs Projekt und für die Lernziele:

### RAG ist nicht überall die Antwort

- **Profil-Extraktion aus Dokumenten** → **KEIN RAG.** Reine strukturierte Extraktion
  (LLM + Zod-Schema via `generateObject`). Kein Chunking, keine Vektorsuche.
- **Matching Job ↔ Profil** → Embeddings nur als **Vorfilter** („welche 50 von 5000
  sind thematisch nah?"). Der eigentliche Score braucht mehr (siehe unten).
- **Bewerbungs-Generierung** → **echtes RAG** (relevante Ausschnitte aus Lebenslauf,
  Zeugnissen, früheren Bewerbungen als Kontext).

**Kernsatz:** _Vektorsuche ist ein Retrieval-/Vorfilter-Werkzeug, kein Bewertungs-
Werkzeug. Sie findet „ähnlich", nicht „gut passend"._

### Workflow vs. Agent

- Das meiste in Leopold (finden → dedup → klassifizieren → scoren → speichern) ist ein
  **deterministischer Workflow** = normaler TS-Code, der an Punkten das LLM aufruft.
  **Kein** frei entscheidender Agent (nicht-deterministisch, teuer, schwer zu debuggen).
- **Echter Agent** lohnt sich v.a. bei der **Bewerbungs-Generierung** (LLM entscheidet
  selbst, welche Tools/Kontexte es zieht).
- **Kernsatz:** _Die meisten „Agenten"-Probleme sind in Wahrheit Workflow-Probleme._

### Structured Output = LLM + Zod

„Structured Output" bedeutet konkret: dem LLM ein Zod-Schema vorgeben und garantiert
passendes JSON zurückbekommen (`generateObject` im AI SDK). Das ist die Brücke zwischen
unstrukturierter LLM-Welt und typisiertem Code. An jeder LLM-Grenze anwenden.

### Matching – die zwei Score-Richtungen (noch zu vertiefen)

„Wie gut passt der Job zu meinem Suchprofil" und „wie gut passe ich zum Jobprofil" sind
**konzeptionell verschieden**. Reine Cosine-Similarity reicht für keinen von beiden.
Geplanter Ansatz: **hybrid** – Embedding-Vorfilter + strukturiertes Feld-Matching +
LLM-as-judge für die Nuancen. (Design-Detail für Claude Code.)

### Connector-Abstraktion (Feature 4)

Ein einheitliches Ziel-Schema `JobPosting`; pro Quelle (öffentliche API / Paid-API /
Playwright-Scraper) **ein Adapter**, der auf dieses Schema mappt. Deduplizierung über
`dedupe_hash`; für Cross-Board-Duplikate ggf. Fuzzy-/Near-Duplicate-Erkennung
(Embedding-Ähnlichkeit als Kandidat).

### Code-Stil: objektorientiert (Ausnahme: Next.js-Frontend)

Leopold wird grundsätzlich **objektorientiert** programmiert: Domänenlogik unter
`core/`, `connectors/`, `llm/` und `worker/` wird in Klassen gekapselt (Services,
Strategien, Registries), nicht als lose Sammlung freier Funktionen. Etablierte Muster
im Projekt:

- **Strategy + Registry** für austauschbare Implementierungen (z.B. `connectors/`,
  `core/documents/parsers/`).
- **Template Method** für gemeinsames Ablaufgerüst mit variierenden Schritten (z.B.
  `JobQueue`, `JobWorker`).
- **Service-Klassen als Singleton-Instanzen** für Domänenlogik ohne Varianten (z.B.
  `DocumentService`, `JobPostingService`, `SearchQueryService`), exportiert als
  `export const xyzService = new XyzService();`.
- Methoden ohne Nutzung von Instanzzustand (`this`) sind `private`; echte Instanzfelder
  gibt es dort, wo Konfiguration/Abhängigkeiten injizierbar sein sollen (z.B.
  `EmbeddingClient`, `ProfileExtractor` – Modell/Base-URL per Konstruktor, nicht
  festverdrahtet).

**Ausnahme:** Der **Next.js-Frontend-Bereich** (`app/`) bleibt **funktional** – das ist
im Next.js-Ökosystem der etablierte, idiomatische Stil (siehe nächster Abschnitt).
Server Actions rufen die OOP-Services aus `core/` auf, bleiben selbst aber einfache
`async function`s statt Klassen.

### Next.js – bevorzugter Code-Stil (WICHTIG: schlanke Variante)

Es wird **bewusst die schlanke, „server-first" Variante** von Next.js gewünscht –
maximal wenig Boilerplate, nichts Verstecktes über Daten-Layer hinweg:

- **Lesen:** direkt in **`async` Server Components** mit direktem DB-Zugriff (Drizzle).
  KEIN selbstgebauter Route Handler + Client-`fetch` + TanStack Query für interne Daten.
- **Schreiben (Mutationen):** über **Server Actions** (`"use server"`), mit
  **Zod-Validierung** am Anfang jeder Action (ggf. `next-safe-action`).
- **Client Components** (`"use client"`) nur, wo echte Interaktivität nötig ist
  (TipTap-Editor, Drag-and-Drop-Upload, Live-Statusanzeigen).
- **Route Handler** (`app/api/.../route.ts`) nur, wo ein echter HTTP-Endpoint gebraucht
  wird (z.B. Webhooks, externe Aufrufe), NICHT als Standard-Datenweg der eigenen UI.

Ziel: so wenig Verdrahtung wie möglich, DB-Zugriff dort wo er hingehört (Server),
lesbar für Open-Source-Mitwirkende.

### Next.js-Lernreihenfolge (um sich nicht zu verzetteln)

1. Server vs. Client Components (Default: Server; `"use client"` nur bei Interaktivität)
2. Data Fetching in Server Components (`async` + direkter DB-Zugriff)
3. Server Actions für Mutationen (mit **Zod-Validierung** am Anfang jeder Action,
   ggf. `next-safe-action`)
4. Caching / `revalidatePath` **zuletzt** (verwirrendster Teil)

**Fallen:** DB-Client/Env-Variablen nie in Client Components; Fortschrittsanzeigen
(„Dokument wird geparst…") via Status-Polling gegen die DB, nicht via Server Action.

---

## 7. Offene Entscheidungen (in Claude Code klären)

- ~~**Embedding-Modell**~~ **Entschieden (Phase 2): `bge-m3`, 1024 Dimensionen.**
  Läuft lokal über Ollama (`src/llm/embeddings.ts`, direkter Aufruf der nativen
  `/api/embed`-Batch-API statt AI-SDK-Provider-Abstraktion – für einen einzelnen
  lokalen Endpunkt schlanker).
- ~~**pgvector-Index**~~ **Entschieden (bereits in Phase 0 im Schema angelegt):**
  HNSW-Index, Distanzmetrik Cosine (`vector_cosine_ops`), siehe
  `src/db/schema/document-chunks.ts`. Abfrage über Drizzles `cosineDistance()`
  (`src/core/documents/search-chunks.ts`). **Falle:** der `<=>`-Operator bindet
  schwächer als arithmetische Operatoren – `1 - cosineDistance(...)` braucht
  explizite Klammern, sonst Typfehler in Postgres.
- ~~**Chunking-Strategie**~~ **Entschieden (Phase 2):** einfaches absatzbasiertes
  Packen bis zu einer Zielgröße (`src/core/documents/chunk.ts`), kein Overlap –
  Bewerbungsunterlagen sind kurz und bereits in Absätze strukturiert.
- **Matching-Scoring** im Detail (Gewichtung Embedding / Feld-Match / LLM-Judge).
- ~~**PDF-Weg**~~ **Entschieden (Phase 5): Puppeteer** (nicht react-pdf). Begründung:
  TipTap liefert HTML, Puppeteer rendert es 1:1 ohne Übersetzung in eine zweite
  Komponentensprache (react-pdf hätte eigene Primitiven). "Rendert exakt was im
  Browser sichtbar ist" passt zum WYSIWYG-Anspruch mit Layout-Vorlagen/Farbthemen.
- ~~**Storage**~~ **Entschieden (Phase 5): lokal**, unter `storage/` – gleiches
  Muster wie bei Dokumenten-Uploads (`storage/applications/<id>.pdf`). S3 bleibt
  eine spätere Option, kein Bedarf für das Lernprojekt.
- **DOCX/ODT-Export** bewusst **nicht** Teil von Phase 5 (nur PDF). Könnte später
  separat nachgezogen werden, z.B. via Pandoc als zusätzliche System-Abhängigkeit
  (HTML→DOCX/ODT), da es dafür kein gutes reines npm-Äquivalent gibt.

---

## 8. Empfohlene Umsetzungsreihenfolge (Roadmap)

> Deckt sich bewusst mit den Lernprioritäten und baut inkrementell auf.

**Phase 0 – Fundament**

- Package-Grundgerüst aufsetzen: `src/{shared,db,llm,core,connectors,worker}` +
  ESLint-Grenzregeln (`import/no-restricted-paths`)
- `docker-compose`: Postgres+pgvector, Redis, Ollama
- Drizzle-Schema (erste Tabellen) + Migrationen
- Zod-Schemas in `src/shared`

**Phase 1 – Workspace-Basis (Feature 1)**

- Next.js-Grundgerüst, Upload (react-dropzone)
- Dokumenten-Parsing im Worker (PDF: `unpdf`/`pdf-parse`; DOCX: `mammoth`)
- **Profil-Extraktion** via `generateObject` + Zod (erstes LLM-Feature, KEIN RAG)
- Profildaten anzeigen/manuell editieren

**Phase 2 – RAG-Fundament (Lernziel 1)** ✅ abgeschlossen

- Chunking (`src/core/documents/chunk.ts`) + Embeddings via Ollama/bge-m3
  (`src/llm/embeddings.ts`) für Dokumente
- Neuer Worker-Job `embed-document`, automatisch nach erfolgreichem Parsing
  angestoßen (`src/core/documents/embed.ts`, idempotent – ersetzt bestehende
  Chunks bei Re-Embedding)
- `documents` um `embedding_status`/`embedding_error` erweitert, Status-Badge
  im Workspace
- pgvector-Ähnlichkeitssuche (`src/core/documents/search-chunks.ts`,
  Cosine-Similarity über den in Phase 0 angelegten HNSW-Index)
- Retrieval-Testseite unter `/retrieval` zum Ausprobieren/Verstehen der Suche

**Phase 3 – Connector + Job-Ingestion (Feature 4 + Teil 2)** ✅ abgeschlossen

- Einheitliches `JobPosting`-Schema + Adapter, mittlerweile vier Quellen:
  Arbeitsagentur-API, Arbeitnow, get-in-it, Kimeta (`src/connectors/impl/*.ts`),
  Registry (`src/connectors/registry.ts`). Suchaufträge können Connectors gezielt
  einschränken (`criteria.connectors`, Checkbox-Auswahl im Dialog)
- Dedup zweistufig: `dedupe_hash` pro Connector-Quelle (Re-Poll aktualisiert
  Inhalte) + Near-Duplicate-Erkennung über Embedding-Cosine-Similarity gegen
  kanonische Postings (`src/core/jobs/jobposting-service.ts`)
- Persistierung inkl. Embeddings für Jobs (`job_postings`-Tabelle, HNSW-Index)
- Suchaufträge (`src/core/jobs/search-query-service.ts`, UI unter
  `/search-queries`) + BullMQ Job Scheduler für wiederkehrende Läufe
  (`src/core/queue/job-search-queue.ts`, Worker: `job-search-worker.ts`),
  Intervalle instant (stündlich, da kein Push von den Quellen) / daily

**Phase 4 – Matching (Lernziele 1+2)** ✅ abgeschlossen

- Embedding-Vorfilter (Cosine-Similarity-Schwellwert) → LLM-Judge (hybrid,
  `src/llm/match-judge.ts`)
- Score (`scoreMeToJob`) + `reasoning` (positives/negatives mit Gewichtung)
  persistiert (`src/core/matching/matching-service.ts`, `matches`-Tabelle)
- Matching läuft synchron inline im `job-search-worker.ts` direkt nach dem
  Ingest neuer Postings (kein eigener Queue-Job dafür nötig)
- `/jobs`-UI zeigt Matches inkl. Score/Reasoning-Tooltip

**Phase 5 – Leopold als integrierter AI-Agent + Bewerbungs-Generierung
(Feature 1+3, Lernziele 2+3)** ✅ abgeschlossen (inkl. mehrerer Erweiterungen danach)

Deutlich erweiterter Zuschnitt gegenüber der ursprünglichen Idee "RAG + ggf.
Agent + TipTap + PDF-Export": Leopold bekommt einen **durchgängig integrierten
AI-Agenten mit App-weitem Tool-Calling**, nicht nur ein Bewerbungs-Feature.

- **Zentraler Agent-Chat**: feste, persistente Chat-Sidebar (`src/components/agent/`)
  neben dem Content-Bereich auf jeder Seite, Streaming via AI SDK (`useChat` +
  `streamText`, `stopWhen: stepCountIs(n)` statt `maxSteps` – das ist der
  **erste echte Agent** des Projekts, Multi-Step-Tool-Calling statt reinem
  Structured Output).
- **Tool-Calling** über bestehende Domänen-Services: Dokumente verwalten,
  Profil lesen/bearbeiten, Suchaufträge verwalten, Jobsuche anstoßen,
  Jobinserate auswerten/neu bewerten, Bewerbungen verwalten. Liegt unter
  `src/core/agent/` (nicht `src/llm/agent/`) – ESLint-Zonenregeln verbieten
  `llm/ → core/`, und der Agent orchestriert bestehende `core/`-Services.
  Destruktive Tools (`delete*`) laufen über den `toolApproval`-Mechanismus von
  AI SDK v7 (harte UI-Bestätigung: Stream pausiert bei einem Tool-Approval-
  Request, erst ein Klick im Chat löst die Ausführung aus).
- **Konversationskontext**: eine globale Konversation (Standardkontext) plus
  eine eigene, isolierte Konversation **pro Bewerbung** (`conversations` +
  `messages`-Tabellen, `AgentPanel` erkennt den Kontext über `usePathname()`
  bei `/applications/[id]`).
- **Bewerbungs-Generierung**: echtes RAG (`src/core/documents/search-chunks.ts`,
  Cosine-Suche über `document_chunks`) als Kontext aus Lebenslauf/Zertifikaten,
  kombiniert mit den strukturierten Profildaten. Per Prompt (Agent-Tool)
  ausgelöst, mit Steuerungsfeldern Tonalität, Persönlichkeit (vordefinierte
  Presets, Mehrfachauswahl), Sprache (de/en), Layout-Vorlage und Farbschema.
- **TipTap-WYSIWYG**: Inhalt (Anschreiben/Lebenslauf) editierbar, Layout ist
  **fix** – Layout-Vorlagen (`src/core/applications/layout/`, Strategy+Registry,
  MVP: 1 Vorlage) rendern denselben HTML-Output sowohl für die Editor-Vorschau
  (`<iframe srcDoc>`) als auch für den PDF-Export, echtes WYSIWYG.
- **PDF-Export** über Puppeteer (HTML→PDF). Ursprünglich asynchron über
  Queue/Worker, später (siehe unten) auf on-demand Streaming umgebaut.

**Nach Phase 5 ergänzt** (mehrere Folge-Commits, nicht mehr Teil des ursprünglichen
Phase-5-Zuschnitts, aber direkt darauf aufbauend):

- **Chat-Attachments & PDF-Export-Rework**: Datei-Uploads im Agent-Chat (Staging
  unter `storage/chat-uploads/`, 24h-Cleanup, Tool `addDocumentToProfile` übernimmt
  ein Attachment ins Profil); PDF-Export von asynchron/queue-basiert auf **on-demand
  Streaming** pro Dokument umgestellt (`GET /api/applications/[id]/pdf?doc=`) –
  `pdfStatus`/`pdfPath`/Queue-Job dafür entfernt, da der Export schnell genug ist,
  um synchron im Request zu laufen; Bewerbungsansicht auf Tabs (Anschreiben/
  Lebenslauf) mit je eigenem Download-Button umgebaut; Tool `updateApplicationContent`
  erlaubt dem Agenten gezielte HTML-Patches ohne volle Neugenerierung; „Bewerbung
  löschen" (UI + Agent-Tool) ergänzt.
- **Multi-Profile-Support**: harte Einzelprofil-Annahme im gesamten Code entfernt –
  `profileId` zieht sich jetzt durch Applications, Matches, Documents,
  Conversations und Search Queries. Aktives Profil wird **cookie-basiert**
  verwaltet (kein Auth-System nötig), umschaltbar über ein Dropdown im Header
  (`src/components/profile/profile-switcher.tsx`). Agent-Tools und Worker lösen
  `profileId` bewusst aus der bearbeiteten Entität/Konversation auf statt aus einem
  global gelesenen Cookie – verhindert Cross-Profile-Writes bei einem Profilwechsel
  während ein Hintergrundjob läuft.
- **Jobs-Pagination, Dedup, Connector-Filter**: `/jobs` auf Infinite-Scroll
  umgestellt (`loadMoreJobsAction`) statt fixer 50-Zeilen-Liste; ein
  Unique-Constraint erzwingt **eine Bewerbung pro Profil/Job-Paar**
  (`ApplicationService.create` kurzschließt via `findByProfileAndJob`,
  Migration `0014`); Suchaufträge können Connectors gezielt einschränken (s.o.);
  „Jetzt ausführen" wartet jetzt auf den Job-Abschluss statt Fire-and-Forget
  (`JobQueue.enqueueAndWait`).

**Phase 6 – Open-Source-Politur** ✅ abgeschlossen

- Umbenennung Mortimer → Leopold (Code, UI, Agent-Persona, DB-User/-Name per
  `ALTER USER`/`ALTER DATABASE` ohne Datenverlust, Projektplan)
- `README.md` (Kurzbeschreibung, Tech-Stack, Setup, Dev-Workflow),
  `LICENSE` (MIT)
- `.env.example` und Docker-Onboarding (`docker-compose.yml`) waren bereits
  vorhanden und aktuell

---

## 9. Referenz-Snippets

### Structured Output (Profil-Extraktion) – AI SDK + Zod

```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

const ProfileSchema = z.object({
  name: z.string(),
  skills: z.array(z.string()),
  experience: z.array(
    z.object({
      role: z.string(),
      company: z.string(),
      years: z.number(),
    }),
  ),
});

const { object } = await generateObject({
  model,
  schema: ProfileSchema, // LLM MUSS diesem Schema folgen
  prompt: `Extrahiere die Profildaten aus:\n${lebenslaufText}`,
});
// `object` ist garantiert typisiert & validiert
```

### Einfacher Agent-Loop – AI SDK Tool-Calling

```typescript
import { generateText, tool } from 'ai';
import { z } from 'zod';

const result = await generateText({
  model,
  prompt: 'Finde passende Jobs für Profil X und bewerte den Top-Treffer.',
  tools: {
    searchJobs: tool({
      description: 'Sucht Jobangebote in der DB per Vektor-Ähnlichkeit',
      parameters: z.object({ query: z.string(), limit: z.number() }),
      execute: async ({ query, limit }) => findSimilarJobs(query, limit),
    }),
  },
  maxSteps: 5, // erlaubt mehrfache Tool-Nutzung = simpler Agent-Loop
});
```

---

## 10. Leitsätze (fürs ganze Projekt)

- **Schlank und explizit** vor clever und versteckt (Open-Source-Lesbarkeit).
- **Objektorientiert außerhalb des Frontends:** Domänenlogik (`core/`, `connectors/`,
  `llm/`, `worker/`) in Klassen kapseln; `app/` (Next.js) bleibt funktional.
- **Next.js server-first:** Lesen in `async` Server Components, Schreiben via Server
  Actions – kein unnötiger Client-`fetch`/API-Layer für interne Daten.
- **Worker macht die schwere Arbeit**, nie der Request-Zyklus.
- **DB + Queue** sind die einzige Schnittstelle zwischen App und Worker.
- **Erst Primitive verstehen, dann Frameworks** (AI SDK vor LangGraph).
- **RAG nur, wo Retrieval wirklich gebraucht wird** – nicht als Reflex.
- **Zod an jeder Außengrenze** (HTTP, Dateien, LLM-Ausgaben).
