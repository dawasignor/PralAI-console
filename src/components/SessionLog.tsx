/**
 * Section 3 - the session log, bottom right.
 *
 * Everything the orchestration does, in plain English, with a reference to the
 * workflow it belongs to. One event per line:
 *
 *   12:04:31  MONTY - fetch_weather_data
 *   Hitting Open-Meteo to get cloud cover and rainfall for the event window.
 *   archive-api.open-meteo.com | hourly + daily
 *
 * The coloured rail on the left encodes the level: blue for a step, green for
 * success, amber for a warning, red for a failure. The format is defined once,
 * on LogEvent in api/types.ts - read that before changing anything here.
 */

import { useEffect, useRef } from "react";

import type { LogEvent } from "../api/types";
import { logTranscript } from "../lib/transcript";
import { CopyButton } from "./CopyButton";
import { agentInfo } from "../lib/framework";
import { workflowInfo } from "../lib/workflows";
import { clock } from "../lib/format";

interface Props {
  events: LogEvent[];
}

export function SessionLog({ events }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  // Follow the tail, like a terminal.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  return (
    <section className="panel" aria-label="Session log">
      <header className="panel__head">
        <h2 className="panel__title">Session log</h2>
        <div className="panel__actions">
          <span className="panel__note">{events.length} events</span>
          <CopyButton
            getText={() => logTranscript(events)}
            label="Copy"
            title="Copy the whole session log"
            emptyTitle="No events yet"
          />
        </div>
      </header>

      <div className="panel__scroll">
        {events.length === 0 ? (
          <p className="log__empty">
            Nothing yet. Every hop Argos makes, every API it calls and every
            failure it hits will appear here as it happens.
          </p>
        ) : (
          <div className="log__list">
            {events.map((event) => (
              <Line key={event.id} event={event} />
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>
    </section>
  );
}

/** One log line: rail, meta row, plain-English message, optional detail. */
function Line({ event }: { event: LogEvent }) {
  const agent = agentInfo(event.agent);
  const workflow = event.workflow ? workflowInfo(event.workflow) : undefined;

  return (
    <div className={`log__line log__line--${event.level}`}>
      <span className="log__rail" />
      <div>
        <div className="log__meta">
          <span>{clock(event.ts)}</span>
          <span className="log__agent" style={{ color: agent.colorVar }}>
            {agent.name.toUpperCase()}
          </span>
          {workflow && <span className="log__workflow">- {workflow.id}</span>}
        </div>
        <div className="log__message">{event.message}</div>
        {event.detail && <div className="log__detail">{event.detail}</div>}
      </div>
    </div>
  );
}
