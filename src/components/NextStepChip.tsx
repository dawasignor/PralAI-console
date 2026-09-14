/**
 * What Argos suggests doing next, offered rather than done.
 *
 * One specialist answers per turn and then the turn ends. That makes every hop
 * the user's decision, and this is where the decision is put in front of them:
 * a button that sends the suggestion as the next message, and does nothing at
 * all until they press it.
 *
 * Deliberately not auto-run, and deliberately not a link that quietly queues
 * work. A run costs money and a minute; the point of stopping was that the
 * user chooses.
 */

import type { NextStep } from "../api/types";

interface Props {
  step: NextStep | null;
  disabled: boolean;
  onRun: (text: string) => void;
}

export function NextStepChip({ step, disabled, onRun }: Props) {
  if (!step) return null;

  return (
    <div className="suggest">
      <span className="suggest__label">Suggested next</span>
      <button
        type="button"
        className="suggest__go"
        disabled={disabled}
        onClick={() => onRun(step.label)}
        title={step.why || "Ask Argos to run this next"}
      >
        {step.label}
      </button>
      {step.why && <span className="suggest__why">{step.why}</span>}
    </div>
  );
}
