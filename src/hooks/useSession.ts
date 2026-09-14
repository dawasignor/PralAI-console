/**
 * The session state machine - one hook that owns everything on screen.
 *
 * Flow of a single turn:
 *   1. the user's message is appended to the chat
 *   2. executeNode() starts the run and hands back a taskId
 *   3. that task is polled: each answer carries the steps taken so far and the
 *      elapsed time the backend measured, so the session log fills while the
 *      run happens and the clock shows something true
 *   4. Argos' reply lands in the chat when the poll says the run is over
 *
 * A backend that answers in one hop -- the Netlify stub -- returns no taskId,
 * and step 3 is skipped.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { executeNode, pollTask } from "../api/client";
import { FAILED_AFTER_MS, isRunning as stillRunning } from "../api/types";
import type {
  AgentSlug,
  ExecuteNodeResponse,
  LogEvent,
  PersonaId,
  SessionFacts,
  TaskPoll,
  WorkflowId,
} from "../api/types";

import { newSessionId } from "../lib/format";
import { DEFAULT_PERSONA, personaInfo } from "../lib/personas";

/**
 * How often to ask how the run is going.
 *
 * Under a second so the clock does not visibly tick in jumps, and well above
 * the cost of the call -- the backend answers a poll from memory.
 */
const POLL_EVERY_MS = 700;

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
  // The AOI and event window the backend settled. Null under the stub,
  // which keeps no session at all.
  const [facts, setFacts] = useState<SessionFacts | null>(null);

  // Run settings. Sent with every turn rather than applied once, so a change
  // takes effect on the next message and never rewrites what came before.
  const [persona, setPersona] = useState<PersonaId>(DEFAULT_PERSONA);
  const [verifiedSourcesOnly, setVerifiedSourcesOnly] = useState(false);

  // How long the current (or last) run took, as the backend measured it.
  const [elapsedMs, setElapsedMs] = useState(0);

  // Poll timers, kept so an unmount mid-run does not leave them firing.
  const timers = useRef<number[]>([]);
  // Set on unmount: the poll loop is an await chain, not a timer, so it has to
  // be told to stop rather than cleared.
  const stop = useRef(false);
  /**
   * The log as it stood before this turn began.
   *
   * A poll returns every step of the current run, not just the new ones, so
   * this turn's events are replaced wholesale each time. Earlier turns are
   * kept by rebuilding from here.
   */
  const eventsAtTurnStart = useRef<LogEvent[]>([]);
  // A ref rather than the state flag, because send() reads it inside a closure.
  const busy = useRef(false);
  /**
   * Jargon already explained this session. The technical personas define a term
   * on first use only, and the function is stateless, so the memory lives here
   * and travels on each request.
   *
   * One glossary per session, not one per persona: switching persona does not
   * clear it, because a term explained once has been read once.
   */
  const glossarySeen = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      stop.current = true;
      timers.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  /**
   * Append a log line that the console itself produced, rather than Argos.
   * Changing a setting is part of the session's proceedings, so it is recorded
   * in the same place as everything else.
   */
  const note = useCallback((message: string, detail?: string) => {
    const event: LogEvent = {
      id: `note-${Date.now()}`,
      ts: new Date().toISOString(),
      level: "info",
      agent: "argos",
      message,
      detail,
    };
    // Into the baseline as well as the visible log: a poll rebuilds this
    // turn's events from the baseline, and a note written mid-run would
    // otherwise vanish at the next one.
    eventsAtTurnStart.current = [...eventsAtTurnStart.current, event];
    setEvents((prev) => [...prev, event]);
  }, []);

  const choosePersona = useCallback(
    (next: PersonaId) => {
      setPersona(next);
      note(
        `Persona switched to ${personaInfo(next).name}.`,
        "affects tone and depth only; findings are unchanged",
      );
    },
    [note],
  );

  const chooseVerifiedOnly = useCallback(
    (next: boolean) => {
      setVerifiedSourcesOnly(next);
      note(
        next
          ? "Verified sources only: on. Argos will use products with documented provenance and skip the rest."
          : "Verified sources only: off. Lower-confidence sources may be used.",
        `verifiedSourcesOnly=${next}`,
      );
    },
    [note],
  );

  /**
   * Run one turn, watching it happen.
   *
   * The backend starts the work and hands back a taskId; this polls it, so the
   * session log fills as the run goes rather than replaying afterwards, and the
   * clock shows real elapsed time measured by the backend rather than guessed
   * here. A stub answers in one hop with no taskId, and that path still works.
   */
  const send = useCallback(async (task: string) => {
    const text = task.trim();
    if (!text || busy.current) return;

    busy.current = true;
    stop.current = false;
    setIsRunning(true);
    setElapsedMs(0);
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text },
    ]);

    // Events arrive as a growing list, so this turn's are replaced wholesale
    // each poll. Anything already on screen from earlier turns is kept.
    const before = eventsAtTurnStart.current;

    const land = (response: ExecuteNodeResponse, ms: number) => {
      if (response.glossaryAdded?.length) {
        glossarySeen.current = [
          ...glossarySeen.current,
          ...response.glossaryAdded,
        ];
      }
      setEvents([...before, ...response.events]);
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
      // Kept when a turn comes back without them, so a failed turn does not
      // blank an AOI the session has already settled.
      if (response.session) setFacts(response.session);
      setElapsedMs(response.elapsedMs ?? ms);
      eventsAtTurnStart.current = [...before, ...response.events];
      setActiveAgent(null);
      setIsRunning(false);
      busy.current = false;
    };

    const began = Date.now();
    const started = await executeNode({
      node: "argos",
      sessionId: sessionId.current,
      input: { task: text },
      persona,
      verifiedSourcesOnly,
      glossarySeen: glossarySeen.current,
    });

    // No taskId: a stub, or a backend that answered in one hop. Already done.
    if (!stillRunning(started)) {
      land(started, Date.now() - began);
      return;
    }

    let poll: TaskPoll = started;
    while (stillRunning(poll)) {
      if (stop.current) {                 // unmounted mid-run
        busy.current = false;
        return;
      }
      setElapsedMs(poll.elapsedMs);
      setEvents([...before, ...poll.events]);
      const last = poll.events[poll.events.length - 1];
      if (last) setActiveAgent(last.agent);

      // Past the failure threshold the console stops waiting. The run itself
      // carries on -- a thread mid-model-call cannot be called back -- and its
      // answer is discarded, which is what "it failed" has to mean if the
      // message is not to be contradicted a minute later.
      if (poll.elapsedMs >= FAILED_AFTER_MS) {
        land(
          {
            sessionId: sessionId.current,
            node: "argos",
            status: "error",
            reply:
              "It failed. Try again sometime later.\n\nThe run passed " +
              `${Math.round(FAILED_AFTER_MS / 1000)} seconds without ` +
              "answering, so the console stopped waiting for it.",
            events: poll.events,
          },
          poll.elapsedMs,
        );
        return;
      }

      await new Promise((resume) => {
        timers.current.push(window.setTimeout(resume, POLL_EVERY_MS));
      });
      poll = await pollTask(started.taskId);
    }
    land(poll, Date.now() - began);
  }, [persona, verifiedSourcesOnly]);

  return {
    sessionId: sessionId.current,
    messages,
    events,
    isRunning,
    activeAgent,
    workflowsRun,
    facts,
    persona,
    setPersona: choosePersona,
    verifiedSourcesOnly,
    setVerifiedSourcesOnly: chooseVerifiedOnly,
    elapsedMs,
    send,
  };
}
