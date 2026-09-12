/**
 * The only place in the app that talks to the network.
 *
 * Keeping every call behind executeNode() means swapping the stub for the real
 * Argos service is a one-file change: point API_BASE at the deployed backend,
 * or leave it and let the Netlify function forward.
 */

import type { ExecuteNodeRequest, ExecuteNodeResponse } from "./types";

/**
 * Same-origin by default: Netlify rewrites /api/* onto the functions folder
 * (see netlify.toml), so this works in `netlify dev` and in production alike.
 * Override with VITE_API_BASE when pointing at a Python backend running locally.
 */
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

export async function executeNode(
  request: ExecuteNodeRequest,
): Promise<ExecuteNodeResponse> {
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
