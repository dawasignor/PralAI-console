/**
 * The thesis path as a flowchart: every output of the thesis, in order, and
 * how far this session has got.
 *
 *   green circle             done for this AOI and window
 *   yellow outline, glowing  the next step -- the one Argos recommends
 *   red outline, black fill  not done yet
 *
 * The steps, their order and their status come from the backend
 * (core/thesis_path.py), the same list Argos is shown when it recommends the
 * next step, so the node that glows and the suggestion under the chat cannot
 * disagree. The console keeps no copy of the path: a step added in Python
 * appears here with no edit.
 *
 * Laid out in rows by dependency depth -- a step sits one row below the
 * deepest step it needs -- and drawn as SVG, hand-rolled for the same reason
 * as FlowGraph: the layout is twenty lines, a library would be larger.
 *
 * Read-only on purpose. Running a step costs money and a minute, so the only
 * way to start one is to ask in the chat or press the suggestion.
 */

import type { ThesisStep } from "../api/types";

interface Props {
  steps: ThesisStep[];
}

const W = 340;
const ROW_H = 84;
const TOP = 22;
const R = 10;

const STATUS_TEXT: Record<ThesisStep["status"], string> = {
  done: "done",
  next: "next -- Argos recommends this",
  todo: "not done yet",
};

interface Placed extends ThesisStep {
  x: number;
  y: number;
}

/** Rows by dependency depth, nodes spread evenly across each row. */
function layout(steps: ThesisStep[]): { nodes: Placed[]; height: number } {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const depth = new Map<string, number>();
  const depthOf = (id: string, trail: string[] = []): number => {
    const known = depth.get(id);
    if (known !== undefined) return known;
    // A cycle would be a backend bug; it is drawn flat rather than hanging.
    if (trail.includes(id)) return 0;
    const needs = (byId.get(id)?.needs ?? []).filter((n) => byId.has(n));
    const d = needs.length
      ? 1 + Math.max(...needs.map((n) => depthOf(n, [...trail, id])))
      : 0;
    depth.set(id, d);
    return d;
  };
  steps.forEach((s) => depthOf(s.id));

  const rows = new Map<number, ThesisStep[]>();
  steps.forEach((s) => {
    const d = depth.get(s.id) ?? 0;
    rows.set(d, [...(rows.get(d) ?? []), s]);
  });

  const nodes: Placed[] = [];
  rows.forEach((row, d) => {
    row.forEach((s, i) => {
      nodes.push({ ...s, x: ((i + 0.5) * W) / row.length, y: TOP + d * ROW_H });
    });
  });
  const deepest = Math.max(0, ...Array.from(rows.keys()));
  return { nodes, height: TOP + deepest * ROW_H + 46 };
}

export function ThesisPath({ steps }: Props) {
  if (!steps.length) {
    return (
      <p className="nav__empty">
        The thesis path comes from the Sangam backend, and it has not answered.
        Start it to see which outputs this session has produced.
      </p>
    );
  }

  const { nodes, height } = layout(steps);
  const at = new Map(nodes.map((n) => [n.id, n]));
  const next = nodes.find((n) => n.status === "next");
  const done = nodes.filter((n) => n.status === "done").length;

  return (
    <div className="tpath">
      <svg
        className="tpath__svg"
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        aria-label={
          `Thesis path: ${done} of ${nodes.length} steps done.` +
          (next ? ` Next: ${next.label}.` : " Every step is done.")
        }
      >
        {nodes.flatMap((child) =>
          child.needs.map((id) => {
            const parent = at.get(id);
            if (!parent) return null;
            const midY = (parent.y + child.y) / 2;
            return (
              <path
                key={`${id}-${child.id}`}
                className={`tpath__edge ${parent.status === "done" ? "tpath__edge--done" : ""}`}
                d={`M ${parent.x} ${parent.y + R} C ${parent.x} ${midY}, ${child.x} ${midY}, ${child.x} ${child.y - R}`}
              />
            );
          }),
        )}

        {nodes.map((node) => (
          <g key={node.id} className={`tpath__node tpath__node--${node.status}`}>
            {/* The title is the tooltip and what a screen reader announces:
                the colour alone carries nothing for a reader who cannot see it. */}
            <title>
              {`${node.label}${node.output ? ` (${node.output})` : ""} -- ${STATUS_TEXT[node.status]}. ${node.why}`}
            </title>
            <circle cx={node.x} cy={node.y} r={R} />
            {node.status === "done" && (
              <path
                className="tpath__tick"
                d={`M ${node.x - 4.5} ${node.y + 0.5} l 3 3 l 6 -6.5`}
              />
            )}
            <text className="tpath__label" x={node.x} y={node.y + R + 13}>
              {node.label}
            </text>
            {node.output && (
              <text className="tpath__output" x={node.x} y={node.y + R + 25}>
                {node.output}
              </text>
            )}
          </g>
        ))}
      </svg>

      <div className="tpath__legend" aria-hidden="true">
        <span><i className="tpath__key tpath__key--done" />done</span>
        <span><i className="tpath__key tpath__key--next" />next</span>
        <span><i className="tpath__key tpath__key--todo" />not yet</span>
      </div>
      {next && (
        <p className="tpath__next">
          Next: <strong>{next.label}</strong>
          {next.output ? ` (${next.output})` : ""} -- {next.why}
        </p>
      )}
    </div>
  );
}
