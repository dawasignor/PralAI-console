/**
 * Section 2 - the navigation panel, top right.
 *
 * V1 IS A READ-ONLY STUB. It lists the five agents, highlights whichever is
 * active, and draws the thesis path, which is enough to follow a run. The real
 * navigation - clicking a node to inspect it, pinning an AOI, jumping to a
 * workflow's docs - is the next session's work.
 *
 * TODO(session): nodes and workflows.
 *   - make rows clickable and show the node's spec, inputs and last output
 *   - render the graph itself (argos -> specialist -> back) rather than a list
 *   - load the workflow list from the backend registry, see lib/framework.ts
 */

import { useState } from "react";

import type { AgentSlug, SessionFacts, ThesisStep } from "../api/types";
import { AGENTS } from "../lib/framework";
import { FlowGraph } from "./FlowGraph";
import { ThesisPath } from "./ThesisPath";

interface Props {
  activeAgent: AgentSlug | null;   // who acted most recently
  thesisPath: ThesisStep[];        // the thesis outputs and their status
  facts: SessionFacts | null;      // the AOI and window the backend settled
}

/** (w, s, e, n) to four decimals - about 10 m, finer than any AOI here. */
function bboxText(bbox: [number, number, number, number]): string {
  return bbox.map((value) => value.toFixed(4)).join(", ");
}

export function NavigatorPanel({ activeAgent, thesisPath, facts }: Props) {
  const [graphOpen, setGraphOpen] = useState(false);

  return (
    <section className="panel" aria-label="Agents, tools and workflows">
      <header className="panel__head">
        <h2 className="panel__title">Agents, tools and workflows</h2>
        <span className="panel__note">read only</span>
      </header>

      <div className="panel__scroll">
        {/*
          The session's constants, first because they are the thing the reader
          can actually check. Every agent works from these, and the one error
          nobody downstream can catch - the wrong Boston, the wrong year - is
          obvious here in a glance.
        */}
        <div className="nav__group">
          <p className="nav__label">Session</p>
          {facts?.aoi ? (
            <>
              <div className="fact">
                <span className="fact__key">Area</span>
                <span className="fact__value">{facts.aoi}</span>
              </div>
              {facts.bbox && (
                <div className="fact">
                  <span className="fact__key">Bounds</span>
                  <span className="fact__value fact__value--mono">
                    {bboxText(facts.bbox)}
                  </span>
                </div>
              )}
              <div className="fact">
                <span className="fact__key">When</span>
                <span className="fact__value">
                  {facts.window ?? "not resolved yet"}
                </span>
              </div>
              {!facts.confirmed && (
                <p className="fact__warn">
                  Not confirmed - the agents are told to say so when they rely
                  on it.
                </p>
              )}
            </>
          ) : (
            <p className="nav__empty">
              No area yet. Name a place and roughly when, and Argos will settle
              both against the OpenStreetMap gazetteer and the GDACS disaster
              register before it runs anything.
            </p>
          )}
        </div>

        <div className="nav__group">
          <p className="nav__label">Agents</p>
          {AGENTS.map((agent) => {
            const isActive = agent.slug === activeAgent;
            return (
              <div
                key={agent.slug}
                className={`nav__row ${isActive ? "nav__row--active" : ""}`}
                // The dot carries the state, so it has to carry it for a
                // reader who cannot see colour or motion either.
                title={isActive ? `${agent.name} is working` : `${agent.name} is idle`}
              >
                <span
                  className={`nav__dot ${isActive ? "nav__dot--live" : ""}`}
                  style={{ color: agent.colorVar }}
                />
                <span className="nav__name">
                  {agent.name} <span className="nav__role">{agent.role}</span>
                </span>
              </div>
            );
          })}
        </div>

        {/* The thesis path replaced the workflow list (user decision,
            2026-10-14): a list said what Monty can run, the flowchart says
            how far the thesis has got and what comes next. */}
        <div className="nav__group">
          <p className="nav__label">Thesis path</p>
          <ThesisPath steps={thesisPath} />
        </div>

        <div className="nav__group">
          <button
            type="button"
            className="graph__toggle"
            aria-expanded={graphOpen}
            onClick={() => setGraphOpen((open) => !open)}
          >
            <span className={`graph__caret ${graphOpen ? "graph__caret--open" : ""}`}>
              {graphOpen ? "▾" : "▸"}
            </span>
            Tools and workflows
            <span className="graph__hint">
              {graphOpen ? "click a node, drag to move" : "expand"}
            </span>
          </button>

          {graphOpen && (
            <div className="graph__frame">
              <FlowGraph steps={thesisPath} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
