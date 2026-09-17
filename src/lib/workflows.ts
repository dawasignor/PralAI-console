/**
 * The workflow registry, fetched once from the backend and shared.
 *
 * This replaces a hand-written copy of `core/workflows/` that lived in
 * framework.ts. That copy went stale three times -- a function registered in
 * Python was invisible here until somebody edited a second file in a second
 * language -- so the registry now serves itself over `GET /api/workflows`.
 *
 * A module-level cache rather than a context, because two of the consumers are
 * not components: `lib/transcript.ts` needs the same lookup while building a
 * text export, and threading a provider through it would mean turning a pure
 * function into a hook for no other reason.
 */

import { useEffect, useState } from "react";

import { fetchWorkflows } from "../api/client";
import type { WorkflowId, WorkflowInfo } from "../api/types";

let cache: WorkflowInfo[] = [];
let inFlight: Promise<WorkflowInfo[]> | null = null;
const listeners = new Set<(list: WorkflowInfo[]) => void>();

/** Everything loaded so far. Empty until the first fetch lands. */
export const workflows = (): WorkflowInfo[] => cache;

/**
 * One workflow by id.
 *
 * Falls back to an entry built from the id itself, so a log line naming a
 * workflow registered after this page loaded still renders as something
 * readable instead of blank. The id is always meaningful -- it is the function
 * name -- which is why it is a safe last resort.
 */
export const workflowInfo = (id: WorkflowId): WorkflowInfo =>
  cache.find((w) => w.id === id) ?? {
    id,
    label: id,
    source: "",
    description: "",
    params: [],
  };

/** Fetch once per page load; every later caller joins the same request. */
export function loadWorkflows(): Promise<WorkflowInfo[]> {
  if (inFlight) return inFlight;
  inFlight = fetchWorkflows().then((list) => {
    cache = list;
    listeners.forEach((notify) => notify(list));
    return list;
  });
  return inFlight;
}

/**
 * The registry, for a component that renders it.
 *
 * Returns `[]` on the first render and the real list once it arrives, which is
 * why every consumer has to read as "nothing yet" rather than "nothing".
 */
export function useWorkflows(): WorkflowInfo[] {
  const [list, setList] = useState<WorkflowInfo[]>(cache);

  useEffect(() => {
    let live = true;
    const notify = (next: WorkflowInfo[]) => {
      if (live) setList(next);
    };
    listeners.add(notify);
    void loadWorkflows();
    return () => {
      live = false;
      listeners.delete(notify);
    };
  }, []);

  return list;
}
