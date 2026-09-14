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
