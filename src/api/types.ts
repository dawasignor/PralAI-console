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
export type AgentSlug = "argos" | "norwood" | "monty" | "entro" | "citadel";

/**
 * Workflows Monty can run. Mirrors docs/WORKFLOWS.md in the agent repo.
 * TODO(session): generate this list from the backend registry instead of
 * hardcoding it, so a newly registered workflow shows up here automatically.
 */
export type WorkflowId =
  | "fetch_weather_data"
  | "fetch_lulc_data"
  | "fetch_terrain_data"
  | "fetch_permanent_water";

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
  message: string;            // plain English, one sentence
  detail?: string;            // optional technical remainder
  /**
   * Stub-only: how long after the previous event this one should appear, so a
   * canned run plays out like a live one. The real backend streams instead and
   * will simply omit this.
   */
  delayMs?: number;
}

/** What the front end sends. */
export interface ExecuteNodeRequest {
  node: AgentSlug;            // entry node -- always "argos" in v1
  sessionId: string;
  input: { task: string };    // the user's message, verbatim
  context?: Record<string, unknown>;  // AOI, event window, anything pinned later
}

/** What comes back. */
export interface ExecuteNodeResponse {
  sessionId: string;
  node: AgentSlug;
  status: "ok" | "error" | "partial";
  reply: string;              // the assistant's message for the chat pane
  events: LogEvent[];         // orchestration proceedings for the session log
  /** A thin echo of the graph state, for the navigation panel. */
  state?: {
    route?: AgentSlug;        // last hop Argos chose
    steps?: number;           // delegations spent
    workflowsRun?: WorkflowId[];
  };
}
