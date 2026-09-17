/**
 * The framework as a graph: Argos, its specialists, and the analyses it can
 * reach.
 *
 * A list tells you what exists. A graph tells you what is connected to what,
 * which is the thing a reader actually wants here -- that every analysis hangs
 * off Citadel, that Monty's workflows are a different kind of node entirely,
 * and that Argos is the only route into any of it.
 *
 * Hand-rolled rather than a graph library. The simulation is about forty lines
 * -- repulsion between every pair, a spring along every edge, a pull toward the
 * centre -- and a dependency for that would be larger than the thing it
 * replaces, in a repo that keeps its dependency list short on purpose.
 *
 * TODO(session): complete workflow till here. Clicking a node does nothing on
 * purpose -- selecting one should eventually open what it is, its inputs and
 * its last output, and that is the next piece of work, not a missing handler.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import type { WorkflowInfo } from "../api/types";
import { AGENTS, FLOWS } from "../lib/framework";
import { useWorkflows } from "../lib/workflows";

type Kind = "orchestrator" | "agent" | "flow" | "workflow";

interface Node {
  id: string;
  label: string;
  kind: Kind;
  ready: boolean;
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
  orchestrator: 13, agent: 9, flow: 5.5, workflow: 5.5,
};

const W = 460;
const H = 340;

function build(workflows: WorkflowInfo[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Seeded off the index rather than randomly: a layout that settles somewhere
  // different every time it opens reads as a different graph.
  const place = (i: number, total: number, radius: number) => ({
    x: W / 2 + Math.cos((i / total) * Math.PI * 2 - Math.PI / 2) * radius,
    y: H / 2 + Math.sin((i / total) * Math.PI * 2 - Math.PI / 2) * radius,
  });

  nodes.push({ id: "argos", label: "Argos", kind: "orchestrator", ready: true,
               x: W / 2, y: H / 2, vx: 0, vy: 0 });

  const specialists = AGENTS.filter((a) => a.slug !== "argos");
  specialists.forEach((agent, i) => {
    nodes.push({ id: agent.slug, label: agent.name, kind: "agent", ready: true,
                 ...place(i, specialists.length, 78), vx: 0, vy: 0 });
    edges.push({ from: "argos", to: agent.slug });
  });

  FLOWS.forEach((flow, i) => {
    nodes.push({ id: flow.id, label: flow.label, kind: "flow",
                 ready: flow.ready, ...place(i, FLOWS.length, 145), vx: 0, vy: 0 });
    edges.push({ from: "citadel", to: flow.id });
  });

  workflows.forEach((workflow, i) => {
    nodes.push({ id: workflow.id, label: workflow.label, kind: "workflow",
                 ready: true, ...place(i + 0.5, workflows.length, 118),
                 vx: 0, vy: 0 });
    edges.push({ from: "monty", to: workflow.id });
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

export function FlowGraph() {
  const workflows = useWorkflows();
  // Rebuilt when the registry lands, which is normally one frame after the
  // popup opens. Keyed on the ids rather than the array, so a refetch that
  // returns the same workflows does not restart a settled layout.
  const initial = useMemo(() => build(workflows),
                          [workflows.map((w) => w.id).join(",")]);
  const [nodes, setNodes] = useState<Node[]>(initial.nodes);
  const [hover, setHover] = useState<string | null>(null);
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

  return (
    <svg
      ref={svg}
      className="graph"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="The agent framework: Argos, its specialists, the analyses Citadel can run and the workflows Monty can execute."
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
              ${node.ready ? "" : "graph__node--stub"}
              ${dim ? "graph__node--dim" : ""}`}
            onPointerEnter={() => setHover(node.id)}
            onPointerDown={(event) => {
              held.current = node.id;
              (event.target as Element).setPointerCapture?.(event.pointerId);
            }}
          >
            <circle cx={node.x} cy={node.y} r={SIZE[node.kind]} />
            {/* Labels only for the things that are always worth naming, and
                for whatever is hovered. Eleven flow labels at once is a wall
                of text, not a graph. */}
            {(node.kind !== "flow" && node.kind !== "workflow")
              || hover === node.id ? (
              <text x={node.x} y={node.y + SIZE[node.kind] + 11}>
                {node.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
