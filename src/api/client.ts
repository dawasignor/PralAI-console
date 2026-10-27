/**
 * The only place in the app that talks to the network.
 *
 * Keeping every call behind executeNode() means swapping the stub for the real
 * Argos service is a one-file change: point API_BASE at the deployed backend,
 * or leave it and let the Netlify function forward.
 */

import type {
  ExecuteNodeRequest,
  ExecuteNodeResponse,
  TaskPoll,
  ThesisStep,
  WorkflowInfo,
} from "./types";

/**
 * Same-origin by default: Netlify rewrites /api/* onto the functions folder
 * (see netlify.toml), so this works in `netlify dev` and in production alike.
 * Override with VITE_API_BASE when pointing at a Python backend running locally.
 */
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

/**
 * Where the PNG behind `<image - name>` is served. A plain URL rather than a
 * fetch: the <img> element loads it, so the browser runs the requests in
 * parallel and caches them. `name` is validated in lib/figures.ts first.
 */
/** The data behind a `<table - t-...>` placeholder (core/tables.py). */
export function tableUrl(id: string): string {
  return `${API_BASE}/table/${encodeURIComponent(id)}`;
}

export function figureUrl(name: string): string {
  return `${API_BASE}/figure/${encodeURIComponent(name)}`;
}

export async function executeNode(
  request: ExecuteNodeRequest,
): Promise<TaskPoll> {
  const res = await fetch(`${API_BASE}/execute_node`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  // A transport failure is itself something the session log should show, so it
  // is turned into a normal error response rather than thrown past the UI.
  if (!res.ok) {
    return {
      sessionId: request.sessionId,
      node: request.node,
      status: "error",
      reply:
        "Argos could not be reached. The console is up, but the orchestrator " +
        "did not answer.",
      events: [
        {
          id: `transport-${Date.now()}`,
          ts: new Date().toISOString(),
          level: "error",
          agent: "argos",
          message: `Call to execute_node failed with HTTP ${res.status}.`,
          detail: await res.text().catch(() => ""),
        },
      ],
    };
  }

  return (await res.json()) as ExecuteNodeResponse;
}

/**
 * Ask the backend how a run is going.
 *
 * Returns progress while it is running and the finished response once it is
 * not. A transport failure ends the poll rather than retrying: the caller is
 * already on a clock, and a silent retry loop would spend it.
 */
export async function pollTask(taskId: string): Promise<TaskPoll> {
  const res = await fetch(`${API_BASE}/task/${encodeURIComponent(taskId)}`);
  if (!res.ok) {
    return {
      sessionId: "",
      node: "argos",
      status: "error",
      reply:
        "Lost contact with Argos while the run was in flight. It may still " +
        "be working; ask again.",
      events: [
        {
          id: `poll-${Date.now()}`,
          ts: new Date().toISOString(),
          level: "error",
          agent: "argos",
          message: `Asking after the run failed with HTTP ${res.status}.`,
          detail: await res.text().catch(() => ""),
        },
      ],
    };
  }
  return (await res.json()) as TaskPoll;
}

/**
 * The workflows Monty can run, from the backend registry.
 *
 * This list used to live in `src/lib/framework.ts` as a hand-written copy of
 * `core/workflows/`, and went stale three times -- a function registered in
 * Python stayed invisible in the navigator and the flow graph until somebody
 * remembered to edit a second file in a second language.
 *
 * Returns `[]` rather than throwing. The panel and the graph are context, not
 * the app: a backend that is down should cost the console its workflow list,
 * not its ability to show a conversation.
 */
export async function fetchWorkflows(): Promise<WorkflowInfo[]> {
  try {
    const res = await fetch(`${API_BASE}/workflows`);
    if (!res.ok) return [];
    const body = (await res.json()) as { workflows?: WorkflowInfo[] };
    return body.workflows ?? [];
  } catch {
    return [];
  }
}

/**
 * The thesis path for this session, for the flowchart's first paint.
 *
 * Every finished run carries the same view as `thesisPath`; this covers the
 * moment before the first answer and a reload. Returns `[]` rather than
 * throwing -- the stub has no such route, and a missing flowchart must not
 * cost the console the conversation.
 */
export async function fetchThesisPath(sessionId: string): Promise<ThesisStep[]> {
  try {
    const res = await fetch(
      `${API_BASE}/thesis_path?sessionId=${encodeURIComponent(sessionId)}`,
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { thesisPath?: ThesisStep[] };
    return body.thesisPath ?? [];
  } catch {
    return [];
  }
}
