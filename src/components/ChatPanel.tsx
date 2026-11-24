/**
 * Section 1 - the agentic chat.
 *
 * Takes 70% of the width. The message stream scrolls inside the panel; the
 * panel itself never grows the page, which is what `.panel__scroll` and the
 * `minmax(0, ...)` grid rows in global.css are for.
 */

import { useEffect, useRef } from "react";

import type {
  NextStep,
  PersonaId,
  SessionFacts,
  WorkflowId,
} from "../api/types";
import type { ChatMessage } from "../hooks/useSession";
import { agentInfo } from "../lib/framework";
import { splitFigures } from "../lib/figures";
import { renderMarkdown } from "../lib/markdown";
import { Composer } from "./Composer";
import { FigureImage } from "./FigureImage";
import { TableBlock } from "./TableBlock";
import { NextStepChip } from "./NextStepChip";
import { RunClock } from "./RunClock";

interface Props {
  messages: ChatMessage[];
  isRunning: boolean;
  onSend: (text: string) => void;
  // Run settings live in useSession; the panel only passes them through.
  persona: PersonaId;
  onPersonaChange: (persona: PersonaId) => void;
  verifiedSourcesOnly: boolean;
  onVerifiedChange: (value: boolean) => void;
  /** Passed straight through to the clock on the working line. */
  elapsedMs: number;
  /** What Argos offered to do next, or null. */
  nextStep: NextStep | null;
  /** Passed through to "Check inputs". */
  facts: SessionFacts | null;
  workflowsRun: WorkflowId[];
  /** True while the pinned Kelani basin session is open. */
  pinned?: boolean;
  /** Start a fresh, empty session. */
  onNewSession?: () => void;
  /** Open the pinned Kelani basin session; resolves false when there is none. */
  onOpenPinned?: () => Promise<boolean | undefined>;
}

export function ChatPanel({
  messages,
  isRunning,
  elapsedMs,
  nextStep,
  facts,
  workflowsRun,
  onSend,
  persona,
  onPersonaChange,
  verifiedSourcesOnly,
  onVerifiedChange,
  pinned = false,
  onNewSession,
  onOpenPinned,
}: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view, the way a chat app does.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isRunning]);

  return (
    <section className="panel" aria-label="Agent chat">
      <header className="panel__head">
        <h2 className="panel__title">Agent chat</h2>
        <span className="panel__note">
          {pinned ? "Kelani basin session (fixed area and dates)" : "New session"}
        </span>
        {pinned
          ? onNewSession && (
              <button type="button" className="session__btn" disabled={isRunning}
                      title="Start an empty session: any area and dates"
                      onClick={onNewSession}>
                New session
              </button>
            )
          : onOpenPinned && (
              <button type="button" className="session__btn" disabled={isRunning}
                      title="Open the Kelani basin session with everything said in it"
                      onClick={() => void onOpenPinned()}>
                Kelani basin
              </button>
            )}
      </header>

      <div className="panel__scroll">
        <div className="chat__stream">
          {messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}

          {isRunning && (
            <div className="chat__working">
              <span className="chat__pulse" />
              <RunClock elapsedMs={elapsedMs} />
              Argos is orchestrating...
            </div>
          )}
          {!isRunning && (
            <NextStepChip step={nextStep} disabled={isRunning} onRun={onSend} />
          )}
          <div ref={endRef} />
        </div>
      </div>

      <Composer
        disabled={isRunning}
        onSend={onSend}
        messages={messages}
        persona={persona}
        onPersonaChange={onPersonaChange}
        verifiedSourcesOnly={verifiedSourcesOnly}
        onVerifiedChange={onVerifiedChange}
        facts={facts}
        workflowsRun={workflowsRun}
      />
    </section>
  );
}

/** One bubble. Agent messages carry the speaker's name above them. */
function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const who = isUser ? "You" : agentInfo(message.agent ?? "argos").name;

  return (
    <article
      className={[
        "msg",
        isUser ? "msg--user" : "msg--agent",
        message.isError ? "msg--error" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="msg__who">{who}</span>
      {/* Figure placeholders are split out of the raw text first; every text
          part still goes through renderMarkdown, which escapes every angle
          bracket before a single rule runs, so nothing the model writes can
          introduce markup. A user's message is never scanned for figures. */}
      <div className="msg__body">
        {(isUser ? [{ kind: "text" as const, text: message.text }] : splitFigures(message.text)).map(
          (part, i) =>
            part.kind === "figure" ? (
              <FigureImage key={`fig-${i}-${part.name}`} name={part.name} />
            ) : part.kind === "table" ? (
              <TableBlock key={`tab-${i}-${part.id}`} id={part.id} />
            ) : (
              <div
                key={`txt-${i}`}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(part.text) }}
              />
            ),
        )}
      </div>
    </article>
  );
}
