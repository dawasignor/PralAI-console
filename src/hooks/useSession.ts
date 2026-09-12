/**
 * The session state machine - one hook that owns everything on screen.
 *
 * Flow of a single turn:
 *   1. the user's message is appended to the chat
 *   2. executeNode() is called once, with that text
 *   3. the events that come back are replayed into the session log on timers,
 *      so a stubbed run reads like a live one
 *   4. Argos' reply lands in the chat when the last event has played
 *
 * Step 3 is stub-only theatre and the one piece that changes when the real
 * backend arrives: it will stream events, and each arriving event will simply
 * be appended as it lands. Everything else stays as it is.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { executeNode } from "../api/client";
import type { AgentSlug, LogEvent, WorkflowId } from "../api/types";
import { newSessionId } from "../lib/format";

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  agent?: AgentSlug;          // which agent spoke, for the label above the bubble
  text: string;
  isError?: boolean;
}

/** Shown before the first turn, so the console is never an empty box. */
const GREETING: ChatMessage = {
  id: "greeting",
  role: "agent",
  agent: "argos",
  text:
    "Argos here. Ask about an event and I will route it to the right " +
    "specialist. Try: _rainfall and cloud cover over Shillong during the June " +
    "2023 surge_, or _read land cover for the same window_.",
};

export function useSession() {
  const sessionId = useRef(newSessionId());
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentSlug | null>(null);
  const [workflowsRun, setWorkflowsRun] = useState<WorkflowId[]>([]);

  // Replay timers, kept so an unmount mid-run does not leave them firing.
  const timers = useRef<number[]>([]);
  // A ref rather than the state flag, because send() reads it inside a closure.
  const busy = useRef(false);

  useEffect(() => {
    return () => timers.current.forEach((t) => window.clearTimeout(t));
  }, []);

  const send = useCallback(async (task: string) => {
    const text = task.trim();
    if (!text || busy.current) return;

    busy.current = true;
    setIsRunning(true);
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text },
    ]);

    const response = await executeNode({
      node: "argos",
      sessionId: sessionId.current,
      input: { task: text },
    });

    // Replay: each event waits its own delay on top of the previous one.
    let elapsed = 0;
    response.events.forEach((event) => {
      elapsed += event.delayMs ?? 0;
      const timer = window.setTimeout(() => {
        setEvents((prev) => [...prev, event]);
        setActiveAgent(event.agent);
      }, elapsed);
      timers.current.push(timer);
    });

    // The reply lands just after the last event, never before it.
    const finish = window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "agent",
          agent: response.state?.route ?? response.node,
          text: response.reply,
          isError: response.status === "error",
        },
      ]);
      setWorkflowsRun(response.state?.workflowsRun ?? []);
      setActiveAgent(null);
      setIsRunning(false);
      busy.current = false;
    }, elapsed + 250);
    timers.current.push(finish);
  }, []);

  return {
    sessionId: sessionId.current,
    messages,
    events,
    isRunning,
    activeAgent,
    workflowsRun,
    send,
  };
}
