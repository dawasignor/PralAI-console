/**
 * The clock that runs while Argos does.
 *
 * Sits with the working indicator, where someone waiting is already looking,
 * and shows one thing: how long this has been going. Past the slow threshold
 * it turns amber and past the failure one red -- the colour says "longer than
 * usual" without a sentence saying it, because a sentence that appears at
 * twenty seconds is read once and is furniture by the third run.
 *
 * The time comes from the backend, measured from when the work actually
 * started. Counting here would drift, and would keep counting through a lost
 * connection -- reporting progress on a run nobody is watching.
 */

import { FAILED_AFTER_MS, SLOW_AFTER_MS } from "../api/types";

interface Props {
  elapsedMs: number;
}

/** m:ss, because a run crossing a minute should not read as "74s". */
function clockFace(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function tone(ms: number): string {
  if (ms >= FAILED_AFTER_MS) return "clock--error";
  if (ms >= SLOW_AFTER_MS) return "clock--warn";
  return "";
}

export function RunClock({ elapsedMs }: Props) {
  return (
    <span
      className={`clock ${tone(elapsedMs)}`}
      // Announced on change rather than per tick: a screen reader reading
      // every second would be unusable, and the colour carries no meaning
      // without the number beside it.
      aria-label={`Running for ${clockFace(elapsedMs)}`}
    >
      {clockFace(elapsedMs)}
    </span>
  );
}
