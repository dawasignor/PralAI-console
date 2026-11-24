/**
 * The chat input and the two run settings that sit under it.
 *
 * Enter sends, Shift+Enter makes a new line. Disabled while a run is in
 * flight, so a demo cannot fire two overlapping orchestrations.
 *
 * The settings row carries the persona picker on the left and the
 * verified-sources toggle in the middle. Both are sent with every turn rather
 * than being applied once, so switching mid-conversation takes effect on the
 * next message and nothing is retroactive.
 */

import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import type { PersonaId, SessionFacts, WorkflowId } from "../api/types";
import type { ChatMessage } from "../hooks/useSession";
import { ExportPdfButton } from "./ExportPdfButton";
import { InputsPopup } from "./InputsPopup";
import { PersonaPicker } from "./PersonaPicker";

interface Props {
  disabled: boolean;
  onSend: (text: string) => void;
  /** The whole conversation, so the export knows whether there is one. */
  messages: ChatMessage[];
  persona: PersonaId;
  onPersonaChange: (persona: PersonaId) => void;
  verifiedSourcesOnly: boolean;
  onVerifiedChange: (value: boolean) => void;
  /** For "Check inputs": what the answers were built on. */
  facts: SessionFacts | null;
  workflowsRun: WorkflowId[];
}

export function Composer({
  disabled,
  onSend,
  messages,
  persona,
  onPersonaChange,
  verifiedSourcesOnly,
  onVerifiedChange,
  facts,
  workflowsRun,
}: Props) {
  const [draft, setDraft] = useState("");

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (disabled || !draft.trim()) return;
    onSend(draft);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        className="composer__input"
        rows={2}
        value={draft}
        disabled={disabled}
        placeholder="Ask Argos about an event, an AOI, or a data source..."
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        aria-label="Message Argos"
      />

      <div className="composer__bar">
        <PersonaPicker
          persona={persona}
          onChange={onPersonaChange}
          disabled={disabled}
        />

        {/* A switch, not a checkbox: it changes what Argos is allowed to use. */}
        <button
          type="button"
          className={`switch ${verifiedSourcesOnly ? "switch--on" : ""}`}
          role="switch"
          aria-checked={verifiedSourcesOnly}
          disabled={disabled}
          onClick={() => onVerifiedChange(!verifiedSourcesOnly)}
          title="Restrict Argos to sources with documented provenance. Fewer answers, higher confidence."
        >
          <span className="switch__track">
            <span className="switch__knob" />
          </span>
          Strictly verified, high-confidence sources only
        </button>

        <InputsPopup
          facts={facts}
          workflowsRun={workflowsRun}
          persona={persona}
          verifiedSourcesOnly={verifiedSourcesOnly}
        />

        {/* The greeting alone is not a conversation worth exporting. */}
        <ExportPdfButton enabled={messages.some((m) => m.role === "user")} />

        <button
          className="composer__send"
          type="submit"
          disabled={disabled || !draft.trim()}
        >
          Send
        </button>
      </div>
    </form>
  );
}
