# Mortimer – Projektplan & Kontext-Briefing

> **Zweck dieses Dokuments:** Kontext-Briefing für die Weiterarbeit in Claude Code.
> Es hält alle bisher getroffenen Stack- und Architekturentscheidungen fest –
> **inklusive der Begründungen**, damit die Entscheidungen nachvollziehbar bleiben
> und nicht versehentlich revidiert werden.

---

## 1. Projektüberblick

**Mortimer** ist ein KI-Agent zur Unterstützung bei Jobsuche und Bewerbung.

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

| Bereich | Wahl | Begründung |
|---|---|---|
| Sprache/Runtime | **TypeScript**, Node.js 22+ | Kein Python gewünscht; reifes JS/TS-Ökosystem für LLM/RAG |
| Frontend + API | **Next.js (App Router)**, **server-first / schlanke Variante** | Marktrelevant, integriert, viel Lernmaterial. Bewusst als **zusätzliches Lernziel** gewählt. Stil: Server Components + Server Actions, minimales Boilerplate (Details §6) |
| WYSIWYG-Editor | **TipTap** (ProseMirror-basiert) | Ideal für strukturierte Dokumente (Lebenslauf/Anschreiben) |
| Upload | **react-dropzone** | Drag-and-Drop |
| UI | **shadcn/ui + Tailwind** | Schlank, verbreitet |
| Worker | **Eigenständiger Node-Prozess** | Trennt schwere Logik (Scraping, Embedding, Matching) vom Web-Request-Zyklus |
| Queue/Scheduling | **BullMQ (Redis)** | Wiederkehrende Suchaufträge, Benachrichtigungsintervalle (Repeatable Jobs) |
| DB + Vektoren | **PostgreSQL + pgvector** | Eine DB für relationale Daten **und** RAG – keine separate Vektor-DB nötig |
| ORM | **Drizzle** | TypeScript-nativ, schlank, explizit |
| Validierung / Schemas | **Zod** | Laufzeit-Validierung + abgeleitete TS-Typen; Basis für Structured Output |
| LLM-Schicht | **Vercel AI SDK** | Schlanke, typisierte Primitive (Tool-Calling, `generateObject`), Provider-Abstraktion |
| Embeddings | **Ollama, lokal** (z.B. `bge-m3` / `nomic-embed-text`) | Kostenlos, deutschtauglich (Modellwahl noch offen, siehe §7) |
| Generierung | **Claude / GPT** (via AI SDK) | Beste Qualität für Anschreiben/Extraktion |
| Agenten-Orchestrierung | **AI SDK zuerst**, **LangGraph.js gezielt später** | Erst Primitive verstehen, Framework nur wo echter Mehrwert |
| Scraping | **Playwright** | Exzellente Node-Bindings, kein Python |
| PDF-Export | **react-pdf** oder **Puppeteer** | Deklarativ (react-pdf) oder HTML→PDF (Puppeteer) |
| Paketmanager | **pnpm** (ein einziges Package, keine Workspaces) | Siehe „Modularer Monolith statt Multi-Package-Monorepo" unten |
| Grenzen zwischen Modulen | **ESLint (`import/no-restricted-paths`)** statt physischer Packages | Erzwingt Abhängigkeitsrichtung zur Lint-Zeit, ohne `workspace:*`-Overhead |

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

**Kernsatz:** *Vektorsuche ist ein Retrieval-/Vorfilter-Werkzeug, kein Bewertungs-
Werkzeug. Sie findet „ähnlich", nicht „gut passend".*

### Workflow vs. Agent
- Das meiste in Mortimer (finden → dedup → klassifizieren → scoren → speichern) ist ein
  **deterministischer Workflow** = normaler TS-Code, der an Punkten das LLM aufruft.
  **Kein** frei entscheidender Agent (nicht-deterministisch, teuer, schwer zu debuggen).
- **Echter Agent** lohnt sich v.a. bei der **Bewerbungs-Generierung** (LLM entscheidet
  selbst, welche Tools/Kontexte es zieht).
- **Kernsatz:** *Die meisten „Agenten"-Probleme sind in Wahrheit Workflow-Probleme.*

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

- **Embedding-Modell** konkret wählen: `bge-m3` vs. `nomic-embed-text` vs.
  `mxbai-embed-large` – Kriterien: Deutsch-Qualität, Dimensionen, Geschwindigkeit.
- **pgvector-Index:** HNSW vs. IVFFlat; Distanzmetrik (cosine/L2/inner product).
- **Chunking-Strategie** für Lebensläufe/Inserate (kurz & strukturiert → feldbasiertes
  oder semantisches Splitten statt naivem Fixed-Size).
- **Matching-Scoring** im Detail (Gewichtung Embedding / Feld-Match / LLM-Judge).
- **PDF-Weg:** react-pdf (deklarativ) vs. Puppeteer (HTML→PDF, nutzt Playwright-Wissen).
- **Storage** für Uploads: lokal (Dev) vs. S3-kompatibel (später).

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

**Phase 2 – RAG-Fundament (Lernziel 1)**
- Chunking + Embeddings (Ollama) für Dokumente
- pgvector-Index, Ähnlichkeitssuche
- Retrieval testen/verstehen (Grundlage für Matching & Generierung)

**Phase 3 – Connector + Job-Ingestion (Feature 4 + Teil 2)**
- Einheitliches `JobPosting`-Schema + erster Adapter (eine öffentliche API oder
  ein Playwright-Scraper)
- Dedup, Persistierung, Embeddings für Jobs
- Suchaufträge + BullMQ Repeatable Jobs

**Phase 4 – Matching (Lernziele 1+2)**
- Embedding-Vorfilter → Feld-Matching → LLM-Judge (hybrid)
- Bidirektionale Scores + `reasoning` persistieren

**Phase 5 – Bewerbungs-Generierung (Feature 3, Lernziele 2+3)**
- Echtes RAG als Kontext; ggf. erster **echter Agent** (AI SDK `maxSteps`,
  später evtl. LangGraph.js)
- TipTap-WYSIWYG, dann PDF-Export

**Phase 6 – Benachrichtigungen (Feature 5)**
- Intervalle (instant/daily) via BullMQ; Zustellkanal (E-Mail o.ä.)

**Phase 7 – Open-Source-Politur**
- README, Lizenz, `.env.example`, Setup-Doku, Docker-Onboarding

---

## 9. Referenz-Snippets

### Structured Output (Profil-Extraktion) – AI SDK + Zod
```typescript
import { generateObject } from "ai";
import { z } from "zod";

const ProfileSchema = z.object({
  name: z.string(),
  skills: z.array(z.string()),
  experience: z.array(z.object({
    role: z.string(),
    company: z.string(),
    years: z.number(),
  })),
});

const { object } = await generateObject({
  model,
  schema: ProfileSchema,          // LLM MUSS diesem Schema folgen
  prompt: `Extrahiere die Profildaten aus:\n${lebenslaufText}`,
});
// `object` ist garantiert typisiert & validiert
```

### Einfacher Agent-Loop – AI SDK Tool-Calling
```typescript
import { generateText, tool } from "ai";
import { z } from "zod";

const result = await generateText({
  model,
  prompt: "Finde passende Jobs für Profil X und bewerte den Top-Treffer.",
  tools: {
    searchJobs: tool({
      description: "Sucht Jobangebote in der DB per Vektor-Ähnlichkeit",
      parameters: z.object({ query: z.string(), limit: z.number() }),
      execute: async ({ query, limit }) => findSimilarJobs(query, limit),
    }),
  },
  maxSteps: 5,  // erlaubt mehrfache Tool-Nutzung = simpler Agent-Loop
});
```

---

## 10. Leitsätze (fürs ganze Projekt)

- **Schlank und explizit** vor clever und versteckt (Open-Source-Lesbarkeit).
- **Next.js server-first:** Lesen in `async` Server Components, Schreiben via Server
  Actions – kein unnötiger Client-`fetch`/API-Layer für interne Daten.
- **Worker macht die schwere Arbeit**, nie der Request-Zyklus.
- **DB + Queue** sind die einzige Schnittstelle zwischen App und Worker.
- **Erst Primitive verstehen, dann Frameworks** (AI SDK vor LangGraph).
- **RAG nur, wo Retrieval wirklich gebraucht wird** – nicht als Reflex.
- **Zod an jeder Außengrenze** (HTTP, Dateien, LLM-Ausgaben).
