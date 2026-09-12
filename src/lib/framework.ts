/**
 * Who the agents are and what workflows exist.
 *
 * This is the console's mirror of the backend: agents match AgentSlug in
 * core/state.py, workflows match docs/WORKFLOWS.md. Both the navigation panel
 * and the session log read from here, so a name is written once.
 *
 * TODO(session): fetch this from the backend registry instead. Hardcoding it
 * means a workflow registered in Python is invisible here until someone
 * remembers to edit this file.
 */

import type { AgentSlug, WorkflowId } from "../api/types";

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

export interface WorkflowInfo {
  id: WorkflowId;
  label: string;
  source: string;        // where the data actually comes from
}

export const WORKFLOWS: WorkflowInfo[] = [
  { id: "fetch_weather_data", label: "Weather and soil moisture", source: "Open-Meteo + ERA5-Land" },
  { id: "fetch_lulc_data", label: "Land-cover indices", source: "Sentinel-2 L2A" },
  { id: "fetch_terrain_data", label: "Elevation and slope", source: "Copernicus DEM GLO-30" },
  { id: "fetch_permanent_water", label: "Permanent water baseline", source: "JRC Global Surface Water" },
];

/** Look-ups by slug/id, so components do not each write their own find(). */
export const agentInfo = (slug: AgentSlug): AgentInfo =>
  AGENTS.find((a) => a.slug === slug) ?? AGENTS[0];

export const workflowInfo = (id: WorkflowId): WorkflowInfo | undefined =>
  WORKFLOWS.find((w) => w.id === id);
