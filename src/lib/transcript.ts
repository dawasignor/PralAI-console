/**
 * Turning what is on screen into text someone can paste elsewhere.
 *
 * Kept out of the components because the *shape* of a transcript is a
 * decision, not a rendering detail: someone pastes this into a thesis, an
 * email or an issue, and it has to read as a record on its own -- without the
 * colours, the layout or the tooltips that carried meaning in the UI.
 */

import type { LogEvent } from "../api/types";
import type { ChatMessage } from "../hooks/useSession";
import { agentInfo } from "./framework";
import { workflowInfo } from "./workflows";
import { clock } from "./format";

/** ISO-ish stamp for the header line, so a pasted transcript is dateable. */
function stamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

/**
 * The whole conversation, speaker by speaker.
 *
 * Agent messages keep the agent's name rather than a generic "assistant":
 * which specialist said a thing is the point of a multi-agent transcript.
 */
export function chatTranscript(messages: ChatMessage[]): string {
  if (messages.length === 0) return "";

  const body = messages
    .map((message) => {
      const who =
        message.role === "user"
          ? "You"
          : agentInfo(message.agent ?? "argos").name;
      // A failed turn is marked, because the text of an error can read like a
      // finding once the red border is gone.
      const flag = message.isError ? " [error]" : "";
      return `### ${who}${flag}\n${message.text.trim()}`;
    })
    .join("\n\n");

  return `# Argos Console - chat transcript\n_${stamp()}_\n\n${body}\n`;
}

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
