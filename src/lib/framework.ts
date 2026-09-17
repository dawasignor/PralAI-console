/**
 * Who the agents are, and what analyses Citadel can run.
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
  { slug: "citadel", name: "Citadel", role: "Planning decisions", colorVar: "var(--citadel)" },
];

/**
 * Workflows are NOT here. They are served by the backend registry and read
 * through `lib/workflows.ts` -- the copy that used to live in this file went
 * stale three times. Agents and flows are still hardcoded below; see the TODO
 * on FLOWS.
 */

/** Look-ups by slug, so components do not each write their own find(). */
export const agentInfo = (slug: AgentSlug): AgentInfo =>
  AGENTS.find((a) => a.slug === slug) ?? AGENTS[0];

/**
 * Citadel's analysis flows, as Argos sees them in its routing menu.
 *
 * `ready` means the flow has a knowledge note and a sources note behind it and
 * can produce a sourced answer. `stub` means the procedure is written and the
 * evidence is not -- selecting one gets an honest refusal, which is the
 * designed behaviour, not a bug to hide.
 *
 * TODO(session): fetch from the backend, same as WORKFLOWS above. These mirror
 * `agents/citadel/workflows/*.md` and go stale the moment a flow is added.
 */
export interface FlowInfo {
  id: string;
  label: string;
  nexus: "water" | "food" | "energy" | "other";
  ready: boolean;
}

export const FLOWS: FlowInfo[] = [
  { id: "sewage_infection_risk", label: "Sewage and infection risk", nexus: "water", ready: true },
  { id: "drinking_water_scarcity", label: "Drinking water scarcity", nexus: "water", ready: false },
  { id: "critical_infrastructure_and_waterlogging", label: "Critical infrastructure", nexus: "water", ready: false },
  { id: "primary_cooking_fuel_disruption", label: "Cooking fuel disruption", nexus: "food", ready: false },
  { id: "food_aid_and_relief_estimation", label: "Food aid and relief", nexus: "food", ready: false },
  { id: "power_outage_and_disruption_risk", label: "Power outage", nexus: "energy", ready: false },
  { id: "electric_shock_hazard", label: "Electric shock hazard", nexus: "energy", ready: false },
  { id: "rockfall_treefall_and_landslide_risk", label: "Landslide and rockfall", nexus: "other", ready: false },
  { id: "cultural_heritage_and_home_flooding_risk", label: "Heritage and home flooding", nexus: "other", ready: false },
  { id: "river_and_ocean_hazard", label: "River and ocean hazard", nexus: "other", ready: false },
];
