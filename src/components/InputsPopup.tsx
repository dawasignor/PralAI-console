/**
 * "Check inputs" - everything the answers in this session were built on.
 *
 * The console shows what the agents concluded. This shows what they were
 * standing on when they concluded it: which area, which event window, with
 * which settings, and from which data.
 *
 * **Data drawn on** lists EVERY data input a session can use (the registry's
 * `dataInput` tools, user decision 2026-11-02), each as a button: grey until
 * it is fetched for this AOI and window, green once it is. Clicking one shows
 * its one plain line. "Fetched" is the session record's own list
 * (`session.fetched`) plus whatever this turn ran, so a fetch shows green the
 * moment its answer arrives.
 */

import { useEffect, useRef, useState } from "react";

import type { PersonaId, SessionFacts, WorkflowId } from "../api/types";
import { useWorkflows } from "../lib/workflows";
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
  const [picked, setPicked] = useState<string | null>(null);
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

  const inputs = workflows
    .filter((w) => w.dataInput && w.available !== false)
    .sort((a, b) => (a.inputOrder ?? 99) - (b.inputOrder ?? 99));
  const fetched = new Set<string>([...(facts?.fetched ?? []), ...workflowsRun]);
  const chosen = inputs.find((w) => w.id === picked);
  const count = inputs.filter((w) => fetched.has(w.id)).length;

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
            <span className="inputs__tag">
              this session · {count} of {inputs.length}
            </span>
          </p>
          <div className="inputs__chips">
            {inputs.map((w) => {
              const got = fetched.has(w.id);
              return (
                <button
                  key={w.id}
                  type="button"
                  className={`inputs__chip ${got ? "inputs__chip--got" : ""}
                    ${picked === w.id ? "inputs__chip--picked" : ""}`}
                  aria-pressed={picked === w.id}
                  title={got ? "Fetched for this area and window" : "Not fetched yet"}
                  onClick={() => setPicked((was) => (was === w.id ? null : w.id))}
                >
                  {w.label}
                </button>
              );
            })}
          </div>
          <p className="inputs__empty">
            {chosen
              ? `${chosen.label}: ${chosen.summary || chosen.description}` +
                (chosen.source ? ` (${chosen.source})` : "")
              : "Green: fetched for this area and window. Click one to see what it is."}
          </p>
        </div>
      )}
    </div>
  );
}
