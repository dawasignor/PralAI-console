# Argos Console

A front end for [PralAI](https://github.com/dawasignor/PralAI), the five-agent
flood-analysis framework. It exists to **showcase the research** - to
give a reader one screen where they can ask a question, watch the orchestration
happen, and see where it succeeded or failed.

It is not the system. The system is the Python repo; this is a window onto it.

**V1 is stubbed.** No LangGraph runs behind it yet. The API contract is real,
the orchestration replayed in the log is a faithful script of what the agents
actually do, and swapping the stub for the backend is a one-file change.

---

## The screen

```
+-------------------------------+--------------------+
|                               |  Nodes/workflows   |   <- where the run is
|   Agent chat            70%   +--------------------+
|                               |  Session log       |   <- what it is doing
+-------------------------------+--------------------+
```

1. **Agent chat** (70% of the width) - a normal scrolling chatbot. Everything
   typed here goes to Argos through `execute_node`.
2. **Navigation panel** (top right) - the five agents and four workflows, with
   whatever is active highlighted. Read-only in v1; see [TODO.md](TODO.md).
3. **Session log** (bottom right) - every hop, API call and failure in plain
   English, tagged with the workflow it belongs to.

---

## One API: `execute_node`

There is exactly one endpoint. Every user message, whatever it is about, goes
through it:

```
POST /api/execute_node

{
  "node": "argos",
  "sessionId": "s-m1k2j3",
  "input": { "task": "rainfall over Shillong during the June 2023 surge" },
  "persona": "chanakya",
  "verifiedSourcesOnly": true
}
```

```
{
  "sessionId": "s-m1k2j3",
  "node": "argos",
  "status": "ok",
  "reply": "**Weather retrieved for the event window.** ...",
  "events": [ /* LogEvent[] - what the session log renders */ ],
  "state": { "route": "monty", "steps": 1, "workflowsRun": ["fetch_weather_data"] }
}
```

The shapes live in [`src/api/types.ts`](src/api/types.ts) and are imported by
both the front end and the function, so the two cannot drift apart.

### The two run settings

Both travel on **every** turn, not once per session, so changing one takes
effect on the next message and never rewrites what came before.

`persona` - which voice the agents answer in. Three options, chosen from the
picker at the bottom of the chat:

| Persona | Register | Voice |
|---|---|---|
| `flood_bot` | plain | **Flood bot** - for the general public. Tone is ELI10; the language follows ASD-STE100 Simplified Technical English - short sentences, one idea each, active voice, common words. The two are separate: STE governs how simple the wording is, not how the reply sounds. The default. |
| `chanakya` | technical | Strategic and terse. Leads with the decision and the risk, for a planner rather than a scientist. |
| `norwood` | technical | The Earth-observation specialist. Sensors, bands, thresholds, and the caveats an EO reader expects. |

Two rules hold across all three:

**A persona changes voice and depth only.** It must never change which
workflows run or what the numbers say - two personas asked the same question
have to agree on the facts. Basic language is not less information: Flood bot
gets its own plain-English text for each result (`plainReply` on the
scenario), saying the same thing in smaller words. Nothing important is
dropped to make a reply simpler.

**The technical personas explain their jargon.** Every term and abbreviation
is defined the first time it appears in a session, and never again. The terms
live in [`src/lib/glossary.ts`](src/lib/glossary.ts); what has already been
explained travels on the request as `glossarySeen`, and the reply names what
it just defined in `glossaryAdded`. Flood bot never uses the table, because its
text is not supposed to contain jargon in the first place.

The persona copy lives in [`src/lib/personas.ts`](src/lib/personas.ts).

`verifiedSourcesOnly` - the toggle beside the picker. On, Argos is restricted
to products with documented provenance and names what it dropped; off, it says
so once rather than letting the reader assume everything was vetted. The honest
consequence is **fewer answers, not better-looking ones**: a run left with only
unverified sources should fail rather than quietly use them.

### The session-log format

One event per line. `message` is plain English and must stand alone; `detail`
carries the technical remainder.

```
12:04:31  MONTY - fetch_weather_data
Hitting Open-Meteo to get cloud cover and rainfall for the event window.
archive-api.open-meteo.com | hourly + daily | timezone=local
```

`level` (`info` / `ok` / `warn` / `error`) colours the rail on the left. The
format is **provisional** - it mirrors `core/logbook.py` in the agent repo but
has not been agreed against it yet. See [TODO.md](TODO.md).

### Figures in an answer

Argus can place a cached figure in its answer with a placeholder on its own
line, `<image - kelani-2025-bui>`: the experiment (`region-year`) and the
figure name. `src/lib/figures.ts` splits the reply on these. The text renders
at once; each figure is its own `<img>` (`src/components/FigureImage.tsx`)
loading from `GET {VITE_API_BASE}/figure/<name>`, so images arrive in parallel
and never hold up the text. A name the backend does not have shows "Figure
unavailable" in place. The figures live only in the backend's local
`experiments/` folder, so the Netlify demo has none.

### Sessions (since 2026-11-21; fresh by default since 2026-11-23)

The console opens on a FRESH session: a new id, an empty context, any area and
dates. The **Kelani basin** button in the chat header calls
`POST {VITE_API_BASE}/session/open`, which returns the pinned Kelani basin
session id, its constants, its thesis path and every answer given in it so
far, and replays them; **New session** starts a fresh one again. (The like button, frozen modules and the
rollback on return were removed on 2026-11-23.)

Under the Netlify stub `session/open` does not exist; the console falls back
to a throwaway session id.

---

## Running it

```bash
npm install
npm run dev
```

`npm run dev` serves the front end **and** the `execute_node` function - a small
Vite plugin in `vite.config.ts` mounts the function on `/api/*` locally, so the
Netlify CLI is not needed. `netlify dev` also works if you prefer it.

```bash
npm run build      # typecheck, then production bundle into dist/
npm run typecheck  # types only
```

---

## Deploying to Netlify

`netlify.toml` holds everything: build command, publish directory, functions
directory, the `/api/*` rewrite, and the SPA fallback. Connect the repo and
Netlify needs no further configuration.

To point the console at a real backend instead of the bundled stub, set
`VITE_API_BASE` in the Netlify UI (for example
`https://argos.example.org/api`). Nothing else changes.

---

## Layout of the repo

```
netlify/functions/execute_node.ts   the one API - stubbed Argos
src/api/types.ts                    the contract, shared by both sides
src/api/client.ts                   the only place that calls fetch()
src/hooks/useSession.ts             session state: chat, log, replay timing
src/components/ChatPanel.tsx        section 1
src/components/NavigatorPanel.tsx   section 2  (stub)
src/components/SessionLog.tsx       section 3
src/lib/framework.ts                the agent and workflow registry
src/styles/global.css               tokens, layout, one block per panel
```

---

## What is stubbed

| Piece | State |
|---|---|
| `execute_node` | Recognises intent by keyword and replays a scripted run |
| Agent replies | Written by hand; numbers are illustrative and marked as such |
| Navigation panel | Lists nodes and workflows, highlights the active one; not interactive |
| Personas | The switch is real and reaches the API; the two registers are written by hand rather than generated |
| Jargon glossary | Real first-use-only behaviour, over a fixed term table |
| Verified sources only | Real flag on the request; the stub names kept and dropped sources from a fixed list |
| Streaming | Events arrive in one batch and are replayed on timers |

One stubbed run **fails on purpose**: asking for land cover reports that no
Sentinel-2 scene clears the 0.9 valid-pixel threshold. That is the real
behaviour of the pipeline over monsoon terrain, and the console shows it rather
than a tidier fiction.
