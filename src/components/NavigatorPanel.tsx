/**
 * Section 2 - the navigation panel, top right.
 *
 * V1 IS A READ-ONLY STUB. It lists the five agents and the four workflows and
 * highlights whichever is active, which is enough to follow a run. The real
 * navigation - clicking a node to inspect it, pinning an AOI, jumping to a
 * workflow's docs - is the next session's work.
 *
 * TODO(session): nodes and workflows.
 *   - make rows clickable and show the node's spec, inputs and last output
 *   - render the graph itself (argos -> specialist -> back) rather than a list
 *   - load the workflow list from the backend registry, see lib/framework.ts
 */

import type { AgentSlug, SessionFacts, WorkflowId } from "../api/types";
import { AGENTS, WORKFLOWS } from "../lib/framework";

interface Props {
  activeAgent: AgentSlug | null;   // who acted most recently
  workflowsRun: WorkflowId[];      // workflows touched by the last turn
  facts: SessionFacts | null;      // the AOI and window the backend settled
}

/** (w, s, e, n) to four decimals - about 10 m, finer than any AOI here. */
function bboxText(bbox: [number, number, number, number]): string {
  return bbox.map((value) => value.toFixed(4)).join(", ");
}

export function NavigatorPanel({ activeAgent, workflowsRun, facts }: Props) {
  return (
    <section className="panel" aria-label="Nodes and workflows">
      <header className="panel__head">
        <h2 className="panel__title">Nodes and workflows</h2>
        <span className="panel__note">v1 - read only</span>
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
              >
                <span className="nav__dot" style={{ color: agent.colorVar }} />
                <span className="nav__name">
                  {agent.name} <span className="nav__role">{agent.role}</span>
                </span>
                <span className="nav__state">{isActive ? "active" : "idle"}</span>
              </div>
            );
          })}
        </div>

        <div className="nav__group">
          <p className="nav__label">Workflows</p>
          {WORKFLOWS.map((workflow) => {
            const wasRun = workflowsRun.includes(workflow.id);
            return (
              <div
                key={workflow.id}
                className={`nav__row ${wasRun ? "nav__row--active" : ""}`}
                title={workflow.source}
              >
                <span
                  className="nav__dot"
                  style={{ color: wasRun ? "var(--ok)" : "var(--line)" }}
                />
                <span className="nav__name">
                  {workflow.label} <span className="nav__role">{workflow.source}</span>
                </span>
                <span className="nav__state">{wasRun ? "ran" : "-"}</span>
              </div>
            );
          })}
        </div>

        <p className="todo">
          TODO (this session): make nodes selectable, draw the graph, and pull
          the workflow list from the backend registry.
        </p>
      </div>
    </section>
  );
}
