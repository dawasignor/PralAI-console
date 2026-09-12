/**
 * The chat input.
 *
 * Enter sends, Shift+Enter makes a new line. Disabled while a run is in
 * flight, so a demo cannot fire two overlapping orchestrations.
 */

import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

interface Props {
  disabled: boolean;
  onSend: (text: string) => void;
}

export function Composer({ disabled, onSend }: Props) {
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
      <button
        className="composer__send"
        type="submit"
        disabled={disabled || !draft.trim()}
      >
        Send
      </button>
    </form>
  );
}
