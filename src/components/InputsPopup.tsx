/**
 * "Check inputs" - everything the answers in this session were built on.
 *
 * The console shows what the agents concluded. This shows what they were
 * standing on when they concluded it, which is the question a reader actually
 * has to be able to answer before quoting any of it: which area, which event
 * window, from which register, with which settings, and from which data.
 *
 * **Partly stubbed, and marked where it is.** The session constants and the
 * run settings are live -- they come back on every turn. The data and
 * knowledge sources are not: the backend knows which citation keys an answer
 * rested on and does not send them yet.
 *
 * TODO(session): wire the lower two sections to the backend.
 *   - `session.sources` on the execute_node response: the numbered input
 *     sources actually drawn on this session (the registry in the vault's
 *     `Citadel input sources` (Chanakya's), 1-22), each with its provider and vintage.
 *   - The citation keys each answer used, from the flow's sources note, so a
 *     claim in the chat can be traced to the reference behind it.
 * Until then this lists what a run *would* draw on, clearly labelled, rather
 * than inventing a provenance trail that was never recorded.
 */

import { useEffect, useRef, useState } from "react";

import type { PersonaId, SessionFacts, WorkflowId } from "../api/types";
import { useWorkflows, workflowInfo } from "../lib/workflows";
import { personaInfo } from "../lib/personas";

interface Props {
  facts: SessionFacts | null;
  workflowsRun: WorkflowId[];
  persona: PersonaId;
  verifiedSourcesOnly: boolean;
}

/** (w, s, e, n) to four decimals -- about 10 m, finer than any AOI here. */
function bboxText(bbox: [number, number, number, number]): string {
  return bbox.map((value) => value.toFixed(4)).join(", ");
}

function Row({ label, value, source }:
             { label: string; value: string; source?: string }) {
  return (
    <div className="inputs__row">
      <span className="inputs__key">{label}</span>
      <span className="inputs__value">
        {value}
        {source && <span className="inputs__source">{source}</span>}
      </span>
    </div>
  );
}

export function InputsPopup({ facts, workflowsRun, persona,
                              verifiedSourcesOnly }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const workflows = useWorkflows();

  // Escape and outside-click, bound only while open -- the same behaviour the
  // persona picker has, so the two popups do not feel like different apps.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const ran = workflows.filter((w) => workflowsRun.includes(w.id));

  return (
    <div className="inputs" ref={rootRef}>
      <button
        type="button"
        className="inputs__button"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
        title="What the answers in this session were built on"
      >
        <span aria-hidden="true">&#9432;</span> Check inputs
      </button>

      {open && (
        <div className="inputs__panel" role="dialog" aria-label="Session inputs">
          <p className="inputs__heading">Session constants</p>
          {facts?.aoi ? (
            <>
              <Row label="Area" value={facts.aoi}
                   source="OpenStreetMap Nominatim" />
              {facts.bbox && (
                <Row label="Bounds" value={bboxText(facts.bbox)}
                     source="EPSG:4326, west south east north" />
              )}
              <Row label="Window" value={facts.window ?? "not resolved"}
                   source={facts.event ? "GDACS disaster register" : undefined} />
              <Row label="Settled"
                   value={facts.confirmed
                     ? "yes -- corroborated against a register"
                     : "no -- still a reading, not a decision"} />
              <Row label="Turns" value={String(facts.turns)} />
            </>
          ) : (
            <p className="inputs__empty">
              No area or window yet. Name a place and roughly when, and both are
              settled against the gazetteer and the disaster register before
              anything runs.
            </p>
          )}

          <p className="inputs__heading">Run settings</p>
          <Row label="Persona" value={personaInfo(persona).name}
               source="tone and depth only; never what the analysis finds" />
          <Row label="Sources"
               value={verifiedSourcesOnly
                 ? "verified only -- unsupported claims are dropped"
                 : "all, including lower-confidence"} />

          <p className="inputs__heading">
            Data drawn on
            <span className="inputs__tag">this session</span>
          </p>
          {ran.length ? (
            ran.map((w) => (
              <Row key={w.id} label={workflowInfo(w.id)?.label ?? w.id}
                   value={w.source} />
            ))
          ) : (
            <p className="inputs__empty">
              No data workflow has run yet this session.
            </p>
          )}

          <p className="inputs__heading">
            Knowledge behind the answers
            <span className="inputs__tag inputs__tag--stub">stub</span>
          </p>
          <p className="inputs__empty">
            The backend knows which citation keys each answer rested on and does
            not send them yet, so listing any here would be inventing a
            provenance trail that was never recorded. Until it does, the
            references at the end of each answer are the reliable record.
          </p>
          <p className="todo">
            TODO: wire this to the session&apos;s source list -- the numbered
            input sources actually drawn on (the registry in the vault, 1-22)
            with provider and vintage, and the citation keys each answer used,
            so a claim in the chat can be traced to the reference behind it.
          </p>
        </div>
      )}
    </div>
  );
}
