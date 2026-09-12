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
import { newTerms } from "../../src/lib/glossary";

/** An event without the bookkeeping fields -- those are filled in by script(). */
type Step = Omit<LogEvent, "id" | "ts">;

/** A canned run: how to recognise it, what it logs, what Argos says. */
interface Scenario {
  id: string;
  /** Any of these words in the user's message selects this scenario. */
  match: RegExp;
  steps: Step[];
  /** Technical register - Chanakya and Agent Norwood. */
  reply: string;
  /**
   * Plain register - CK bot. Written to ASD-STE100: short sentences, one idea
   * each, active voice, common words, no unexplained abbreviation. It says the
   * same thing as `reply`, in smaller words - never less.
   */
  plainReply: string;
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
    plainReply:
      "**We got the weather for those days.**\n\n" +
      "We asked a weather service for the hours around the event. It gave us " +
      "the rain, the cloud, the wind and the sunlight. It also gave us how wet " +
      "the soil was, near the top and deeper down.\n\n" +
      "One thing to know. We group the rain into days. We use a world clock, " +
      "not your local clock. A storm late at night can show on the day before.\n\n" +
      "_This is a practice run. The numbers are examples._",
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
    plainReply:
      "**We could not see the ground from space.**\n\n" +
      "This satellite takes photos. A photo cannot show the ground through " +
      "cloud. We looked at 17 photos from the last 90 days. In every photo, " +
      "cloud covered too much of the area.\n\n" +
      "So we stopped. We did not lower our quality limit to get an answer. A " +
      "bad photo gives a wrong answer. A wrong answer is worse than no answer.\n\n" +
      "There is another way. Some satellites use radar instead of a camera. " +
      "Radar can see through cloud. That is the next thing to try.\n\n" +
      "_This is a practice run. The numbers are examples._",
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
    plainReply:
      "**We got the shape of the land.**\n\n" +
      "We used a height map of the world. It gives the height of the ground " +
      "about every 30 metres. From the heights, we worked out how steep the " +
      "land is.\n\n" +
      "Steepness matters in a flood. Water runs off steep land quickly. Water " +
      "sits on flat land.\n\n" +
      "_This is a practice run. The numbers are examples._",
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
    plainReply:
      "**We found the water that is always there.**\n\n" +
      "Some water stays all year, like a river or a lake. Other water comes " +
      "only in the wet season. We used a world map of surface water to tell " +
      "the two apart.\n\n" +
      "This step matters. If we do not know where the river is, we can count " +
      "the river itself as a flood. Then the flood looks bigger than it is.\n\n" +
      "_This is a practice run. The numbers are examples._",
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
  plainReply:
    "**Hello. I am the Citizen Knowledge bot.**\n\n" +
    "I answer questions about floods. I work with a team. One member looks at " +
    "satellite photos. One member collects the data. One member checks how " +
    "sure we are. One member helps city planners decide.\n\n" +
    "You can ask me about the rain, about the shape of the land, or about " +
    "where water usually sits.\n\n" +
    "_This is a practice run._",
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
 * Build the reply for the chosen persona.
 *
 * Two registers, picked by `persona.style`:
 *
 *   plain      CK bot gets `scenario.plainReply` -- the same findings written
 *              in Simplified Technical English. Simpler words, never less
 *              information, and no abbreviation the reader must look up.
 *
 *   technical  Chanakya and Norwood get `scenario.reply`, plus a definition
 *              for every term appearing for the first time this session.
 *
 * Neither register invents or withholds a finding: the two texts must agree.
 * That is what makes switching persona safe in front of an audience.
 *
 * TODO(backend): the real system should carry the persona into the agent
 * prompts, so both registers are generated rather than written by hand.
 */
function composeReply(
  scenario: Omit<Scenario, "match">,
  personaId: ExecuteNodeRequest["persona"],
  strict: boolean,
  seen: string[],
): { reply: string; glossaryAdded: string[] } {
  const persona = personaInfo(personaId ?? "ck_bot");
  const plain = persona.style === "plain";
  const base = plain ? scenario.plainReply : scenario.reply;

  const parts = [persona.lead, base];
  let added: string[] = [];

  // Jargon is explained once per session, on first appearance. The lead line is
  // included in the scan, since Norwood's own opener contains a term.
  if (persona.explainsJargon) {
    const found = newTerms(`${persona.lead}\n${base}`, seen);
    if (found.length > 0) {
      added = found.map((entry) => entry.term);
      parts.push(
        found.map((entry) => `_${entry.term}: ${entry.meaning}._`).join("\n"),
      );
    }
  }

  if (strict && scenario.sources.length > 0) {
    parts.push(
      plain
        ? `_We used only sources that we can check: ${scenario.sources.join("; ")}._`
        : `_Verified sources only - ${scenario.sources.join("; ")}._`,
    );
  }
  if (persona.close) parts.push(`_${persona.close}_`);

  return { reply: parts.join("\n\n"), glossaryAdded: added };
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

  const { reply, glossaryAdded } = composeReply(
    scenario,
    body.persona,
    strict,
    body.glossarySeen ?? [],
  );

  const response: ExecuteNodeResponse = {
    sessionId: body.sessionId,
    node: body.node ?? "argos",
    status: scenario.status,
    reply,
    events: script(steps, body.sessionId),
    glossaryAdded,
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
