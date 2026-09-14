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
} from "./types";

/**
 * Same-origin by default: Netlify rewrites /api/* onto the functions folder
 * (see netlify.toml), so this works in `netlify dev` and in production alike.
 * Override with VITE_API_BASE when pointing at a Python backend running locally.
 */
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

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
