/**
 * The execute_node contract.
 *
 * Everything the user types goes to Argos through ONE call: execute_node.
 * The front end never knows about individual agents or workflows -- it names a
 * node, hands over the user's text, and gets back a reply plus the orchestration
 * events that happened along the way.
 *
 * This file is the single source of truth for that shape. The Netlify function
 * (netlify/functions/execute_node.ts) imports the same types, so the stub and
 * the real backend cannot drift apart silently.
 */

/** The five agents in the framework. Mirrors AgentSlug in core/state.py. */
export type AgentSlug = "argos" | "norwood" | "monty" | "entro" | "chanakya";

/**
 * A workflow Monty can run, as the backend registry describes it.
 *
 * `WorkflowId` is a plain string and not a union of the five names we happen
 * to know about today: the list is served from `core/workflows/` at runtime
 * (`GET /api/workflows`), so the console cannot know the membership at compile
 * time -- and a union would have been another copy of the registry to go
 * stale, which is the thing this replaced.
 */
export type WorkflowId = string;

export interface WorkflowInfo {
  id: WorkflowId;
  label: string;        // short human name for the panel and the graph
  source: string;       // where the data actually comes from
  description: string;  // the one-liner the routing prompt sees
  params: string[];     // parameter names, the only truth about the signature
}

/** How a step went. Drives the colour of a log line and a node's badge. */
export type EventLevel = "info" | "ok" | "warn" | "error";

/**
 * One line in the session log.
 *
 * FORMAT (v1, provisional -- TODO(session): confirm with the backend logbook):
 *
 *   <time>  <agent> · <workflow?>   <message>
 *   12:04:31  monty · fetch_weather_data
 *             Hitting Open-Meteo for cloud cover and rainfall over
 *             Shillong during Monsoon Surge, 14 Jun 2023.
 *
 * `message` is plain English and must stand on its own -- a reader should not
 * need the code open. `detail` is the technical remainder (status codes, scene
 * ids, thresholds) and is shown in a dimmer second line.
 */
export interface LogEvent {
  id: string;
  ts: string;                 // ISO 8601, stamped by whoever emits the event
  level: EventLevel;
  agent: AgentSlug;
  workflow?: WorkflowId;      // which part of the workflow this belongs to
  /**
   * Who takes over because of this event.
   *
   * A delegation is logged by the agent handing off, so `agent` is Argos while
   * the specialist is the one about to work. The active indicator follows this
   * when it is present, and `agent` otherwise.
   */
  routedTo?: AgentSlug;
  message: string;            // plain English, one sentence
  detail?: string;            // optional technical remainder
  /**
   * Stub-only: how long after the previous event this one should appear, so a
   * canned run plays out like a live one. The real backend streams instead and
   * will simply omit this.
   */
  delayMs?: number;
}

/**
 * The three personas. Picking one changes the tone, the language and how much
 * the agents volunteer -- it does NOT change which workflows run or what the
 * data says. The same run under two personas must not contradict itself.
 *
 * The persona copy lives in src/lib/personas.ts; this is only the identifier
 * that travels on the wire.
 */
export type PersonaId = "ck_bot" | "chanakya" | "norwood";

/** What the front end sends. */
export interface ExecuteNodeRequest {
  node: AgentSlug;            // entry node -- always "argos" in v1
  sessionId: string;
  input: { task: string };    // the user's message, verbatim
  /** Which voice the agents answer in. Chosen in the chat, sent every turn. */
  persona: PersonaId;
  /**
   * Restrict Argos to sources it can vouch for -- official agency data,
   * peer-reviewed products, documented provenance -- and drop the rest.
   *
   * The honest consequence is fewer answers, not better-looking ones: with
   * this on, a run that has only unverified sources should fail rather than
   * quietly use them.
   */
  verifiedSourcesOnly: boolean;
  /**
   * Terms already explained in this session.
   *
   * The technical personas define a term the first time it appears and never
   * again, which needs memory of what has been said. The console keeps that
   * list because the function is stateless; the real backend can keep it in
   * the graph state instead and ignore this field.
   */
  glossarySeen?: string[];
  context?: Record<string, unknown>;  // reserved; the backend owns session state
}

/**
 * The constants that hold for a whole session.
 *
 * The backend resolves these once -- the place name against the OpenStreetMap
 * gazetteer, the time frame against the GDACS disaster register -- and then
 * every agent works from the same ones. They are echoed back on every turn
 * because the user is the only person who can tell at a glance that the AOI
 * is the wrong Boston, and they cannot do that if it never appears on screen.
 *
 * Null until the backend has settled them. The stub never sets them at all.
 */
export interface SessionFacts {
  aoi: string | null;
  /** (west, south, east, north) in EPSG:4326, the order the workflows take. */
  bbox: [number, number, number, number] | null;
  window: string | null;
  event: string | null;
  /** False while the AOI or window is still a reading rather than a decision. */
  confirmed: boolean;
  turns: number;
  /** What the agents have established so far, rewritten each turn by Argos. */
  digest: string | null;
}

/**
 * When a run stops being ordinary -- the one number behind the clock.
 *
 * 20 s: a question answered from the session alone comes back inside that,
 * so marking anything sooner would make every turn look like a problem. Past
 * it the clock turns amber. It puts no sentence on screen: a line of
 * reassurance appearing at twenty seconds is read once and is furniture by
 * the third run.
 *
 * **There is no deadline** (user decision, 2026-10-14). The console used to
 * stop waiting at 300 s and discard any answer that came after; workflow runs
 * -- a validation, a multi-workflow event -- can legitimately take longer, and
 * the backend kept working regardless. The console now waits for the answer
 * however long the run takes. A run that has genuinely died still ends: the
 * backend reports a crash as an answer, and a restarted backend answers
 * "unknown", which stops the polling.
 */
export const SLOW_AFTER_MS = 20_000;

/**
 * What the backend says when asked how a run is going.
 *
 * A run takes tens of seconds, so `execute_node` starts it and hands back a
 * `taskId` rather than blocking. Polling `/task/<id>` returns this until the
 * run ends, and then returns the full ExecuteNodeResponse.
 *
 * The stub keeps no jobs and answers in one hop with no `taskId`, so a caller
 * has to handle both shapes: a `reply` means done, a `taskId` means poll.
 */
export interface TaskProgress {
  taskId: string;
  sessionId?: string;
  status: "running";
  /** Milliseconds since the run started, measured by the backend. */
  elapsedMs: number;
  /** Every step taken so far. Grows; never reordered. */
  events: LogEvent[];
}

/** A poll answers with one or the other. */
export type TaskPoll = TaskProgress | ExecuteNodeResponse;

export function isRunning(poll: TaskPoll): poll is TaskProgress {
  return poll.status === "running";
}

/** What comes back. */
export interface ExecuteNodeResponse {
  sessionId: string;
  /** Present when the backend ran this in the background. Absent from the stub. */
  taskId?: string;
  /** How long the run took, once it is over. */
  elapsedMs?: number;
  node: AgentSlug;
  /**
   * "unknown" means the backend is no longer tracking this run -- it restarted,
   * or the job aged out. The caller should stop polling rather than retry.
   */
  status: "ok" | "error" | "partial" | "unknown";
  reply: string;              // the assistant's message for the chat pane
  events: LogEvent[];         // orchestration proceedings for the session log
  /** Terms explained in this reply, for the caller to add to glossarySeen. */
  glossaryAdded?: string[];
  /** A thin echo of the graph state, for the navigation panel. */
  state?: {
    route?: AgentSlug;        // last hop Argos chose
    steps?: number;           // delegations spent
    workflowsRun?: WorkflowId[];
  };
  /** The session's constants. Absent from the stub, which keeps no session. */
  session?: SessionFacts | null;
  /**
   * What Argos thinks should follow -- offered, never run.
   *
   * One specialist answers per turn and then the turn ends, so the next hop is
   * the user's decision. It arrives here as something to show them, and takes
   * effect only if they ask for it. Null when the question is answered and
   * nothing obvious follows.
   */
  nextStep?: NextStep | null;
  /**
   * The thesis outputs in order and how far this session is, for the
   * flowchart. Absent from the stub, which keeps no session.
   */
  thesisPath?: ThesisStep[] | null;
}

/**
 * One step of the thesis path (core/thesis_path.py on the backend).
 *
 * "done": run for this AOI and window. "next": the first step not done whose
 * `needs` are all done -- the one Argos recommends. "todo": everything else.
 */
export interface ThesisStep {
  id: string;
  label: string;
  /** "Output 1", "Outputs 3-4", or "" for a step that feeds one. */
  output: string;
  kind: "workflow" | "flow";
  /** The workflow, or `agent:flow` for an analysis. */
  name: string;
  /** Ids of the steps this one stands on -- the flowchart's edges. */
  needs: string[];
  status: "done" | "next" | "todo";
  /** What the console would send to run it. */
  prompt: string;
  why: string;
}

/** An analysis Argos suggests running next. */
export interface NextStep {
  /** In the user's words, not the flow's name. */
  label: string;
  /** The flow it maps to, or "" when nothing in the catalogue fits. */
  flow: string;
  /**
   * A data workflow the answer would stand on and the session has not
   * fetched yet (fetch_weather_grid, fetch_lulc_data), or "". Checked by the
   * backend: registered, and not already fetched. Optional because the
   * Netlify stub predates it.
   */
  workflow?: string;
  /** One sentence: what running it would add. */
  why: string;
}
