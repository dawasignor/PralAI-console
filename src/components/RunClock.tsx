/**
 * The clock that runs while Argos does.
 *
 * A run takes tens of seconds and used to show nothing but a disabled Send
 * button, which is indistinguishable from a console that has frozen. This says
 * how long it has been going and, past two thresholds, what that means.
 *
 * The time comes from the backend, which measures it from the moment the work
 * actually started. Counting here would drift, and would keep counting through
 * a lost connection -- reporting progress on a run nobody is watching.
 */

import { FAILED_AFTER_MS, SLOW_AFTER_MS } from "../api/types";

interface Props {
  isRunning: boolean;
  elapsedMs: number;
}

/** m:ss, because a run crossing a minute should not read as "74s". */
function clockFace(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * What to say about the wait, if anything.
 *
 * Silence under 20 s: a normal run finishes in that time, and narrating it
 * would make every turn look like a problem.
 */
function reassurance(ms: number): { text: string; level: string } | null {
  if (ms >= FAILED_AFTER_MS) {
    return { text: "It failed. Try again sometime later.", level: "error" };
  }
  if (ms >= SLOW_AFTER_MS) {
    return { text: "Hang in there, heavy work being done.", level: "warn" };
  }
  return null;
}

export function RunClock({ isRunning, elapsedMs }: Props) {
  // Once idle the clock stays put showing the last run's duration, rather than
  // disappearing -- how long that took is worth knowing after the fact.
  const note = isRunning ? reassurance(elapsedMs) : null;

  return (
    <div
      className={`clock ${isRunning ? "clock--live" : ""} ${
        note ? `clock--${note.level}` : ""
      }`}
      // Announced on a timer, not per tick: a screen reader reading every
      // second would be unusable.
      aria-live="polite"
      title={
        isRunning
          ? "Time since Argos started this run"
          : "How long the last run took"
      }
    >
      <span className="clock__dot" aria-hidden="true" />
      <span className="clock__time">{clockFace(elapsedMs)}</span>
      {note && <span className="clock__note">{note.text}</span>}
    </div>
  );
}
