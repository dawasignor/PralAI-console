# TODO

Ordered by when it blocks something, not by size.

## This session - nodes and workflows (panel 2)

The navigation panel is deliberately a read-only list in v1. The agreed work:

- [ ] Make each node row selectable, and show the node's spec, its inputs and
      its last output when selected.
- [ ] Draw the graph rather than listing it: `argos -> specialist -> argos`,
      including Monty's retry edge (a retry is the same work attempted again,
      not a new delegation).
- [ ] Load agents and workflows from the backend registry instead of the
      hardcoded table in `src/lib/framework.ts`. A workflow registered in
      Python is currently invisible here until someone edits that file.
- [ ] Decide what a node's "state" means in the UI - idle / active / failed is
      probably too thin once retries are shown.

## Session-log format

- [ ] Agree the `LogEvent` shape against `core/logbook.py` in the agent repo.
      The console's format is a guess at the moment: it keeps the clock, the
      actor and the action, but adds a plain-English `message` the backend does
      not emit yet.
- [ ] Decide who writes the plain English - the agent, or a translation layer
      in `execute_node`.
- [ ] Add filtering by agent and by level once a real run produces enough lines
      to need it.

## Backend

- [ ] Replace the scenario table in `netlify/functions/execute_node.ts` with a
      call into the LangGraph runner.
- [ ] Stream events instead of batching them, and delete the replay timers in
      `src/hooks/useSession.ts`.
- [ ] Decide how a long run is handled on Netlify's function timeout - probably
      a job id plus polling, or move the backend off Netlify entirely.

## Smaller

- [ ] Real markdown in chat replies (currently bold and italic only, see
      `src/lib/format.ts`).
- [ ] Persist a session so a demo can be reloaded without losing the log.
- [ ] An AOI / event-date control, so the console stops relying on the user
      naming the place in prose.
