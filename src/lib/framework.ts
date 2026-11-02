/**
 * Who the agents are.
 *
 * The console's mirror of the backend: agents match AgentSlug in core/state.py.
 *
 * Workflows used to be mirrored here too and are not any more -- they are
 * served from the registry and read through `lib/workflows.ts`. What is left
 * in this file is what has no endpoint behind it yet.
 */

import type { AgentSlug } from "../api/types";

export interface AgentInfo {
  slug: AgentSlug;
  name: string;
  role: string;          // one line, plain English
  colorVar: string;      // CSS custom property from global.css
}

export const AGENTS: AgentInfo[] = [
  { slug: "argos", name: "Argos", role: "Orchestrator", colorVar: "var(--argos)" },
  { slug: "norwood", name: "Norwood", role: "Earth observation", colorVar: "var(--norwood)" },
  { slug: "monty", name: "Monty", role: "Runs the workflows", colorVar: "var(--monty)" },
  { slug: "entro", name: "Entro", role: "Uncertainty", colorVar: "var(--entro)" },
  { slug: "chanakya", name: "Chanakya", role: "Planning decisions", colorVar: "var(--chanakya)" },
];

/**
 * Workflows are NOT here. They are served by the backend registry and read
 * through `lib/workflows.ts` -- the copy that used to live in this file went
 * stale three times. The workflows Norwood and Chanakya own come with the
 * thesis path (`owner`, `summary`); only the agents are listed here.
 */

/** Look-ups by slug, so components do not each write their own find(). */
export const agentInfo = (slug: AgentSlug): AgentInfo =>
  AGENTS.find((a) => a.slug === slug) ?? AGENTS[0];
