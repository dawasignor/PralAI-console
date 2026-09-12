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

import type { AgentSlug, WorkflowId } from "../api/types";
import { AGENTS, WORKFLOWS } from "../lib/framework";

interface Props {
  activeAgent: AgentSlug | null;   // who acted most recently
  workflowsRun: WorkflowId[];      // workflows touched by the last turn
}

export function NavigatorPanel({ activeAgent, workflowsRun }: Props) {
  return (
    <section className="panel" aria-label="Nodes and workflows">
      <header className="panel__head">
        <h2 className="panel__title">Nodes and workflows</h2>
        <span className="panel__note">v1 - read only</span>
      </header>

      <div className="panel__scroll">
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
