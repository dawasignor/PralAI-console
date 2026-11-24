/**
 * Turning what is on screen into text someone can paste elsewhere.
 *
 * Kept out of the components because the *shape* of a transcript is a
 * decision, not a rendering detail: someone pastes this into a thesis, an
 * email or an issue, and it has to read as a record on its own -- without the
 * colours, the layout or the tooltips that carried meaning in the UI.
 */

import type { LogEvent } from "../api/types";
import { agentInfo } from "./framework";
import { workflowInfo } from "./workflows";
import { clock } from "./format";

/** ISO-ish stamp for the header line, so a pasted transcript is dateable. */
function stamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

// The chat transcript that lived here went with the "Copy chat" button
// (2026-10-14): the conversation is exported as a PDF of what is on screen,
// figures included -- see components/ExportPdfButton.tsx.

/**
 * The session log, one event per block.
 *
 * The level travels as a word, not a colour: the coloured rail is the only
 * thing marking a failure on screen, and it does not survive a copy.
 */
export function logTranscript(events: LogEvent[]): string {
  if (events.length === 0) return "";

  const body = events
    .map((event) => {
      const agent = agentInfo(event.agent).name.toUpperCase();
      const workflow = event.workflow
        ? ` · ${workflowInfo(event.workflow)?.id ?? event.workflow}`
        : "";
      const head = `${clock(event.ts)}  ${agent}${workflow}  [${event.level}]`;
      const detail = event.detail ? `\n    ${event.detail}` : "";
      return `${head}\n  ${event.message}${detail}`;
    })
    .join("\n\n");

  return (
    `# Argos Console - session log\n_${stamp()} · ${events.length} events_\n\n` +
    `${body}\n`
  );
}
