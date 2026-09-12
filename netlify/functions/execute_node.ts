/**
 * execute_node -- the one API the front end calls.
 *
 * V1 IS A STUB. It does not run LangGraph; it recognises a few intents in the
 * user's text and replays a canned orchestration that matches what the real
 * five-agent system does. The point is that the *contract* is real: when the
 * Python backend is wired up, this file becomes a forwarder and nothing in the
 * UI changes.
 *
 * TODO(backend): replace the scenario table below with a call into the
 * LangGraph runner (agents/argos) and stream events instead of batching them.
 */

import type {
  AgentSlug,
  ExecuteNodeRequest,
  ExecuteNodeResponse,
  LogEvent,
  WorkflowId,
} from "../../src/api/types";
// Runtime import, not a type: the persona copy is written once, in src/lib.
import { personaInfo } from "../../src/lib/personas";

/** An event without the bookkeeping fields -- those are filled in by script(). */
type Step = Omit<LogEvent, "id" | "ts">;

/** A canned run: how to recognise it, what it logs, what Argos says. */
interface Scenario {
  id: string;
  /** Any of these words in the user's message selects this scenario. */
  match: RegExp;
  steps: Step[];
  reply: string;
  status: ExecuteNodeResponse["status"];
  workflowsRun: WorkflowId[];
  route: AgentSlug;
  /** Sources with documented provenance. Always used. */
  sources: string[];
  /**
   * Sources that are dropped when `verifiedSourcesOnly` is on. Naming them
   * keeps the toggle honest: the user can see what the strict setting costs.
   */
  strictDrops: string[];
}

// --- The scenarios ---------------------------------------------------------
// Deliberately includes a failing run. Monsoon AOIs genuinely fail Sentinel-2's
// cloud threshold, and a showcase that only ever succeeds misrepresents the
// research.

const SCENARIOS: Scenario[] = [
  {
    id: "weather",
    match: /weather|rain|rainfall|precipitation|cloud|soil moisture|open.?meteo/i,
    route: "monty",
    workflowsRun: ["fetch_weather_data"],
    sources: ["Open-Meteo Archive (ECMWF reanalysis)", "ERA5-Land (Copernicus)"],
    strictDrops: ["crowd-reported rainfall bulletins"],
    status: "ok",
    steps: [
      {
        level: "info",
        agent: "argos",
        message:
          "Read the request and routed it to Monty, who runs the data workflows.",
        detail: "route=monty step=1",
        delayMs: 250,
      },
      {
        level: "info",
        agent: "monty",
        workflow: "fetch_weather_data",
        message:
          "Hitting Open-Meteo to get cloud cover, rainfall and wind for the event window.",
        detail: "archive-api.open-meteo.com | hourly + daily | timezone=local",
        delayMs: 900,
      },
      {
        level: "info",
        agent: "monty",
        workflow: "fetch_weather_data",
        message:
          "Pulling the two ERA5-Land soil-moisture layers, 0-7 cm and 7-28 cm.",
        detail: "roughly a 9 km grid, so one value covers the whole AOI",
        delayMs: 800,
      },
      {
        level: "ok",
        agent: "monty",
        workflow: "fetch_weather_data",
        message: "Series returned clean. Handing the numbers back to Argos.",
        detail: "7 variables | coordinates snapped to the model grid",
        delayMs: 600,
      },
      {
        level: "info",
        agent: "entro",
        message:
          "Entro flagged the uncertainty worth stating: daily totals are bucketed by UTC day.",
        detail: "open decision, see fetch_weather_data.md",
        delayMs: 700,
      },
    ],
    reply:
      "**Weather retrieved for the event window.**\n\n" +
      "Monty pulled the seven-variable series from the Open-Meteo archive - cloud " +
      "cover, hourly and daily rain, wind, shortwave radiation - plus both " +
      "ERA5-Land soil-moisture layers.\n\n" +
      "One caveat from Entro: daily totals are bucketed by UTC day, not local " +
      "day, so a night-time storm can land in the wrong bucket.\n\n" +
      "_Stubbed run - numbers are illustrative._",
  },
  {
    id: "lulc",
    match: /lulc|land ?cover|sentinel|ndvi|ndbi|ndwi|mndwi|scene|imagery|optical/i,
    route: "norwood",
    workflowsRun: ["fetch_lulc_data"],
    sources: ["Sentinel-2 L2A (ESA, via Earth Search)"],
    strictDrops: ["MODIS composite gap-fill"],
    status: "error",
    steps: [
      {
        level: "info",
        agent: "argos",
        message: "Routed to Norwood, the Earth-observation specialist.",
        detail: "route=norwood step=1",
        delayMs: 250,
      },
      {
        level: "info",
        agent: "monty",
        workflow: "fetch_lulc_data",
        message:
          "Searching Earth Search for Sentinel-2 scenes over the AOI, walking back from the event date.",
        detail: "lookback_days=90 | most recent usable scene, not the clearest",
        delayMs: 1000,
      },
      {
        level: "info",
        agent: "monty",
        workflow: "fetch_lulc_data",
        message:
          "Screening each candidate by reading its cloud mask over the AOI rather than trusting the catalogue.",
        detail: "SCL read at 1/8 resolution | probe_decimation=8",
        delayMs: 1100,
      },
      {
        level: "warn",
        agent: "monty",
        workflow: "fetch_lulc_data",
        message:
          "Every scene in the window is too cloudy. Best candidate reaches 0.62 valid pixels against a 0.9 requirement.",
        detail: "17 candidates probed, 17 rejected",
        delayMs: 900,
      },
      {
        level: "error",
        agent: "monty",
        workflow: "fetch_lulc_data",
        message:
          "Failed to retrieve land cover. Stopping here rather than lowering the threshold.",
        detail: "min_valid_fraction=0.9 held",
        delayMs: 500,
      },
      {
        level: "info",
        agent: "norwood",
        message:
          "Norwood reads this as a result, not a bug - monsoon cloud defeats optical EO over this AOI.",
        detail: "suggests SAR (Sentinel-1) as the alternative",
        delayMs: 800,
      },
    ],
    reply:
      "**No usable Sentinel-2 scene in the window.**\n\n" +
      "Seventeen candidates were probed across a 90-day lookback. The best " +
      "reached 0.62 valid pixels over the AOI against the 0.9 the pipeline " +
      "requires, so the run stopped.\n\n" +
      "The threshold was **not** relaxed to force an answer. This failure is the " +
      "finding: cloud-season optical imagery cannot see this AOI, which is the " +
      "argument for radar.\n\n" +
      "_Stubbed run - numbers are illustrative._",
  },
  {
    id: "terrain",
    match: /terrain|elevation|slope|dem|topograph/i,
    route: "monty",
    workflowsRun: ["fetch_terrain_data"],
    sources: ["Copernicus DEM GLO-30 (ESA)"],
    strictDrops: ["community-contributed elevation traces"],
    status: "ok",
    steps: [
      {
        level: "info",
        agent: "argos",
        message: "Routed to Monty for the terrain workflow.",
        detail: "route=monty step=1",
        delayMs: 250,
      },
      {
        level: "info",
        agent: "monty",
        workflow: "fetch_terrain_data",
        message:
          "Reading Copernicus DEM GLO-30 tiles for the bounding box and deriving slope.",
        detail: "30 m posting | no account or key needed",
        delayMs: 1100,
      },
      {
        level: "ok",
        agent: "monty",
        workflow: "fetch_terrain_data",
        message: "Elevation and slope statistics returned for the AOI.",
        delayMs: 600,
      },
    ],
    reply:
      "**Terrain retrieved.**\n\n" +
      "Copernicus DEM GLO-30 covered the bounding box; slope was derived from " +
      "the elevation grid.\n\n_Stubbed run - numbers are illustrative._",
  },
  {
    id: "water",
    match: /permanent water|water body|jrc|surface water|baseline water/i,
    route: "monty",
    workflowsRun: ["fetch_permanent_water"],
    sources: ["JRC Global Surface Water (European Commission JRC)"],
    strictDrops: ["OpenStreetMap water polygons"],
    status: "ok",
    steps: [
      {
        level: "info",
        agent: "argos",
        message: "Routed to Monty for the permanent-water baseline.",
        detail: "route=monty step=1",
        delayMs: 250,
      },
      {
        level: "info",
        agent: "monty",
        workflow: "fetch_permanent_water",
        message:
          "Reading JRC Global Surface Water to separate permanent water from seasonal water.",
        detail: "needed so a river is not counted as flooding",
        delayMs: 1000,
      },
      {
        level: "ok",
        agent: "monty",
        workflow: "fetch_permanent_water",
        message: "Baseline water mask returned for the AOI.",
        delayMs: 600,
      },
    ],
    reply:
      "**Permanent-water baseline retrieved.**\n\n" +
      "JRC Global Surface Water gives the permanent and seasonal extents, so a " +
      "later flood mask can be differenced against normal water rather than " +
      "reporting the river as a flood.\n\n_Stubbed run - numbers are illustrative._",
  },
];

/** Fallback when nothing matches: Argos answers without delegating. */
const FALLBACK: Omit<Scenario, "match"> = {
  id: "fallback",
  route: "argos",
  workflowsRun: [],
  sources: [],
  strictDrops: [],
  status: "ok",
  steps: [
    {
      level: "info",
      agent: "argos",
      message:
        "Read the request. Nothing here needs a data workflow, so answering directly.",
      detail: "route=argos step=0",
      delayMs: 400,
    },
  ],
  reply:
    "I am **Argos**, the orchestrator. I route work to Norwood (Earth " +
    "observation), Monty (data workflows), Entro (uncertainty) and Citadel " +
    "(planning decisions).\n\nTry asking for rainfall during an event, a " +
    "land-cover read, terrain, or the permanent-water baseline.\n\n" +
    "_V1 console - responses are stubbed._",
};

/** Stamp ids and timestamps onto a scenario's steps. */
function script(steps: Step[], sessionId: string): LogEvent[] {
  return steps.map((step, i) => ({
    ...step,
    id: `${sessionId}-${Date.now()}-${i}`,
    ts: new Date().toISOString(),
  }));
}

/**
 * What the source setting adds to the log, before the run proper.
 *
 * On: name the sources that survive and the ones dropped, so the cost of the
 * setting is visible. Off: say so once, rather than leaving the reader to
 * assume everything was vetted.
 */
function sourceSteps(scenario: Omit<Scenario, "match">, strict: boolean): Step[] {
  if (scenario.sources.length === 0) return [];

  if (!strict) {
    return [
      {
        level: "info",
        agent: "argos",
        message:
          "Verified-sources-only is off, so lower-confidence sources may be " +
          "used alongside the primary ones.",
        detail: `may include: ${scenario.strictDrops.join(", ")}`,
        delayMs: 300,
      },
    ];
  }

  const steps: Step[] = [
    {
      level: "info",
      agent: "argos",
      message:
        "Verified sources only: restricting this run to products with " +
        "documented provenance.",
      detail: `keeping: ${scenario.sources.join(", ")}`,
      delayMs: 300,
    },
  ];

  if (scenario.strictDrops.length > 0) {
    steps.push({
      level: "warn",
      agent: "argos",
      message: `Dropped ${scenario.strictDrops.length} source that could not be vouched for.`,
      detail: `dropped: ${scenario.strictDrops.join(", ")}`,
      delayMs: 400,
    });
  }

  return steps;
}

/**
 * Wrap a reply in the chosen persona's voice.
 *
 * The scenario's own text is never rewritten -- only framed. Two personas
 * asked the same question therefore agree on every fact, which is the rule
 * that makes the switch safe to demo.
 *
 * TODO(backend): the real system should carry the persona into the agent
 * prompts instead, so the voice is generated rather than bolted on.
 */
function composeReply(
  base: string,
  personaId: ExecuteNodeRequest["persona"],
  strict: boolean,
  sources: string[],
): string {
  const persona = personaInfo(personaId ?? "ck_bot");
  const parts = [persona.lead, base];

  if (strict && sources.length > 0) {
    parts.push(`_Verified sources only - ${sources.join("; ")}._`);
  }
  if (persona.close) parts.push(`_${persona.close}_`);

  return parts.join("\n\n");
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("execute_node accepts POST only", { status: 405 });
  }

  const body = (await req.json()) as ExecuteNodeRequest;
  const task = body.input?.task ?? "";
  const strict = body.verifiedSourcesOnly === true;

  const scenario =
    SCENARIOS.find((candidate) => candidate.match.test(task)) ?? FALLBACK;

  // Source bookkeeping first, then the run itself - the same order the real
  // orchestrator would use, since the setting decides what it may call.
  const steps = [...sourceSteps(scenario, strict), ...scenario.steps];

  const response: ExecuteNodeResponse = {
    sessionId: body.sessionId,
    node: body.node ?? "argos",
    status: scenario.status,
    reply: composeReply(scenario.reply, body.persona, strict, scenario.sources),
    events: script(steps, body.sessionId),
    state: {
      route: scenario.route,
      steps: scenario.workflowsRun.length,
      workflowsRun: scenario.workflowsRun,
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
