/**
 * Section 1 - the agentic chat.
 *
 * Takes 70% of the width. The message stream scrolls inside the panel; the
 * panel itself never grows the page, which is what `.panel__scroll` and the
 * `minmax(0, ...)` grid rows in global.css are for.
 */

import { useEffect, useRef } from "react";

import type { PersonaId } from "../api/types";
import type { ChatMessage } from "../hooks/useSession";
import { agentInfo } from "../lib/framework";
import { miniMarkdown } from "../lib/format";
import { Composer } from "./Composer";

interface Props {
  messages: ChatMessage[];
  isRunning: boolean;
  onSend: (text: string) => void;
  // Run settings live in useSession; the panel only passes them through.
  persona: PersonaId;
  onPersonaChange: (persona: PersonaId) => void;
  verifiedSourcesOnly: boolean;
  onVerifiedChange: (value: boolean) => void;
}

export function ChatPanel({
  messages,
  isRunning,
  onSend,
  persona,
  onPersonaChange,
  verifiedSourcesOnly,
  onVerifiedChange,
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
        <span className="panel__note">Argos - orchestrator</span>
      </header>

      <div className="panel__scroll">
        <div className="chat__stream">
          {messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}

          {isRunning && (
            <div className="chat__working">
              <span className="chat__pulse" />
              Argos is orchestrating...
            </div>
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
      {/* Safe: miniMarkdown escapes the text before adding its two tags. */}
      <div
        className="msg__body"
        dangerouslySetInnerHTML={{ __html: miniMarkdown(message.text) }}
      />
    </article>
  );
}
