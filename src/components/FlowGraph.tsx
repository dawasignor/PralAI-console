/**
 * Tools and workflows: Argos, its specialists, the workflows each owns and
 * the tools Monty runs (user decision 2026-11-02).
 *
 * Norwood owns every thesis workflow but Modules 9 and 10, which are
 * Chanakya's; both come from the thesis path the backend serves, named, never
 * numbered. Monty's tools come from the registry, switched-off ones left out.
 * Clicking a node shows its one plain line (core/one_liners.py).
 *
 * Hand-rolled rather than a graph library. The simulation is about forty lines
 * -- repulsion between every pair, a spring along every edge, a pull toward the
 * centre -- and a dependency for that would be larger than the thing it
 * replaces, in a repo that keeps its dependency list short on purpose.
 *
 */

import { useEffect, useMemo, useRef, useState } from "react";

import type { ThesisStep, WorkflowInfo } from "../api/types";
import { AGENTS } from "../lib/framework";
import { useWorkflows } from "../lib/workflows";

type Kind = "orchestrator" | "agent" | "workflow" | "tool";

interface Node {
  id: string;
  label: string;
  kind: Kind;
  ready: boolean;
  summary: string;
  owner?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Edge {
  from: string;
  to: string;
}

/** Radius by kind, so importance reads before any label does. */
const SIZE: Record<Kind, number> = {
  orchestrator: 13, agent: 9, workflow: 6, tool: 5,
};

const W = 460;
const H = 340;

function build(tools: WorkflowInfo[], steps: ThesisStep[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Seeded off the index rather than randomly: a layout that settles somewhere
  // different every time it opens reads as a different graph.
  const place = (i: number, total: number, radius: number) => ({
    x: W / 2 + Math.cos((i / total) * Math.PI * 2 - Math.PI / 2) * radius,
    y: H / 2 + Math.sin((i / total) * Math.PI * 2 - Math.PI / 2) * radius,
  });

  nodes.push({ id: "argos", label: "Argos", kind: "orchestrator", ready: true,
               summary: "Routes each request to the right specialist and writes the answer.",
               x: W / 2, y: H / 2, vx: 0, vy: 0 });

  const specialists = AGENTS.filter((a) => a.slug !== "argos");
  specialists.forEach((agent, i) => {
    nodes.push({ id: agent.slug, label: agent.name, kind: "agent", ready: true,
                 summary: agent.role, ...place(i, specialists.length, 78), vx: 0, vy: 0 });
    edges.push({ from: "argos", to: agent.slug });
  });

  // The workflows: Norwood's and Chanakya's, by name.
  steps.forEach((step, i) => {
    const id = `step:${step.id}`;
    nodes.push({ id, label: step.label, kind: "workflow", ready: true, owner: step.owner,
                 summary: step.summary || step.why,
                 ...place(i, steps.length, 145), vx: 0, vy: 0 });
    edges.push({ from: step.owner === "chanakya" ? "chanakya" : "norwood", to: id });
  });

  // The tools Monty runs; a switched-off one is not shown.
  const live = tools.filter((t) => t.available !== false);
  live.forEach((tool, i) => {
    nodes.push({ id: `tool:${tool.id}`, label: tool.label, kind: "tool", ready: true,
                 summary: tool.summary || tool.description,
                 ...place(i + 0.5, live.length, 118), vx: 0, vy: 0 });
    edges.push({ from: "monty", to: `tool:${tool.id}` });
  });

  return { nodes, edges };
}

/**
 * One step of the layout.
 *
 * Every pair repels, every edge pulls to its rest length, and everything drifts
 * gently toward the middle so a disconnected cluster cannot wander off screen.
 * Velocity is damped hard, which is what stops it oscillating forever.
 */
function step(nodes: Node[], edges: Edge[], held: string | null) {
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      // Two nodes at the same point give a zero vector and no way out of it.
      let d2 = dx * dx + dy * dy;
      if (d2 < 0.01) {
        dx = (i - j) * 0.1 || 0.1;
        dy = 0.1;
        d2 = 0.02;
      }
      const force = 900 / d2;
      const d = Math.sqrt(d2);
      a.vx -= (dx / d) * force;
      a.vy -= (dy / d) * force;
      b.vx += (dx / d) * force;
      b.vy += (dy / d) * force;
    }
  }

  const at = new Map(nodes.map((n) => [n.id, n]));
  for (const edge of edges) {
    const a = at.get(edge.from);
    const b = at.get(edge.to);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    const pull = (d - 62) * 0.012;
    a.vx += (dx / d) * pull;
    a.vy += (dy / d) * pull;
    b.vx -= (dx / d) * pull;
    b.vy -= (dy / d) * pull;
  }

  for (const node of nodes) {
    if (node.id === held) {          // a dragged node follows the pointer only
      node.vx = 0;
      node.vy = 0;
      continue;
    }
    node.vx += (W / 2 - node.x) * 0.004;
    node.vy += (H / 2 - node.y) * 0.004;
    node.vx *= 0.82;
    node.vy *= 0.82;
    node.x = Math.min(W - 12, Math.max(12, node.x + node.vx));
    node.y = Math.min(H - 12, Math.max(12, node.y + node.vy));
  }
}

export function FlowGraph({ steps }: { steps: ThesisStep[] }) {
  const workflows = useWorkflows();
  // Rebuilt when the registry or the path lands. Keyed on the ids rather than
  // the arrays, so a refetch that returns the same lists does not restart a
  // settled layout.
  const initial = useMemo(() => build(workflows, steps),
                          [workflows.map((w) => w.id).join(","),
                           steps.map((s) => `${s.id}:${s.owner}`).join(",")]);
  const [nodes, setNodes] = useState<Node[]>(initial.nodes);
  const [hover, setHover] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const down = useRef<{ x: number; y: number } | null>(null);
  const edges = initial.edges;

  const held = useRef<string | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const frame = useRef<number>();
  // Settle, then stop. A simulation left running forever burns a core for a
  // picture that stopped moving thirty seconds ago.
  const ticks = useRef(0);
  /**
   * The positions the simulation actually owns.
   *
   * A drag has to write in here, not into React state: the loop rebuilds state
   * from this array every frame, so a dragged node set in state alone is
   * overwritten before it can be seen -- which is exactly what happened.
   */
  const live = useRef<Node[]>(initial.nodes.map((n) => ({ ...n })));

  // `live` is a ref, so it keeps the node set it was created with. When the
  // registry lands the graph gains nodes, and without this the simulation goes
  // on animating the old set -- the new workflow renders once and then never
  // moves, because nothing in the loop knows about it. Resetting the tick
  // count too, so the enlarged graph gets a full settle rather than inheriting
  // the budget the smaller one had already spent.
  useEffect(() => {
    live.current = initial.nodes.map((n) => ({ ...n }));
    ticks.current = 0;
    setNodes(initial.nodes);
  }, [initial]);

  useEffect(() => {
    const loop = () => {
      const settled = ticks.current > 420 && !held.current;
      if (!settled) {
        step(live.current, edges, held.current);
        ticks.current += 1;
        setNodes(live.current.map((n) => ({ ...n })));
      }
      frame.current = requestAnimationFrame(loop);
    };
    frame.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame.current!);
  }, [edges]);

  /** Pointer position in the SVG's own coordinates, at any pane size. */
  function at(event: React.PointerEvent): { x: number; y: number } {
    const box = svg.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * W,
      y: ((event.clientY - box.top) / box.height) * H,
    };
  }

  const near = new Set<string>();
  if (hover) {
    near.add(hover);
    for (const edge of edges) {
      if (edge.from === hover) near.add(edge.to);
      if (edge.to === hover) near.add(edge.from);
    }
  }

  const position = new Map(nodes.map((n) => [n.id, n]));
  const chosen = picked ? position.get(picked) : undefined;

  return (
    <>
    <svg
      ref={svg}
      className="graph"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Tools and workflows: Argos, its specialists, the workflows Norwood and Chanakya own and the tools Monty runs."
      onPointerMove={(event) => {
        if (!held.current) return;
        const point = at(event);
        const node = live.current.find((n) => n.id === held.current);
        if (!node) return;
        node.x = point.x;
        node.y = point.y;
        node.vx = 0;
        node.vy = 0;
        // Woken so the loop renders the move and lets the neighbours follow;
        // a settled simulation is otherwise not drawing anything.
        ticks.current = 0;
      }}
      onPointerUp={() => { held.current = null; ticks.current = 0; }}
      onPointerLeave={() => { held.current = null; setHover(null); }}
    >
      {edges.map((edge) => {
        const a = position.get(edge.from);
        const b = position.get(edge.to);
        if (!a || !b) return null;
        const lit = hover && (edge.from === hover || edge.to === hover);
        return (
          <line
            key={`${edge.from}-${edge.to}`}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            className={`graph__edge ${lit ? "graph__edge--lit" : ""}
              ${hover && !lit ? "graph__edge--dim" : ""}`}
          />
        );
      })}

      {nodes.map((node) => {
        const dim = hover && !near.has(node.id);
        return (
          <g
            key={node.id}
            className={`graph__node graph__node--${node.kind}
              ${node.owner === "chanakya" ? "graph__node--chanakya" : ""}
              ${picked === node.id ? "graph__node--picked" : ""}
              ${dim ? "graph__node--dim" : ""}`}
            onPointerEnter={() => setHover(node.id)}
            onPointerDown={(event) => {
              held.current = node.id;
              down.current = { x: event.clientX, y: event.clientY };
              (event.target as Element).setPointerCapture?.(event.pointerId);
            }}
            onPointerUp={(event) => {
              // A click, not a drag: show what the node does.
              const start = down.current;
              if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 5) {
                setPicked((was) => (was === node.id ? null : node.id));
              }
              down.current = null;
            }}
          >
            <circle cx={node.x} cy={node.y} r={SIZE[node.kind]} />
            {/* Labels only for the things that are always worth naming, and
                for whatever is hovered. Eleven flow labels at once is a wall
                of text, not a graph. */}
            {node.kind === "orchestrator" || node.kind === "agent"
              || hover === node.id || picked === node.id ? (
              <text x={node.x} y={node.y + SIZE[node.kind] + 11}>
                {node.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
    <p className="graph__detail" aria-live="polite">
      {chosen ? (
        <>
          <strong>{chosen.label}</strong>
          {chosen.summary ? ` -- ${chosen.summary}` : ""}
        </>
      ) : (
        "Click a node to see what it does."
      )}
    </p>
    </>
  );
}
