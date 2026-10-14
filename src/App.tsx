/**
 * The console shell - three panels, one session.
 *
 *   +---------------------------+------------------+
 *   |                           |  navigation      |  <- nodes and workflows
 *   |   agent chat (70%)        +------------------+
 *   |                           |  session log     |  <- what Argos is doing
 *   +---------------------------+------------------+
 *
 * All shared state lives in useSession(); the panels are presentational and
 * take it as props. That keeps the data flow one-directional and obvious.
 */

import { ChatPanel } from "./components/ChatPanel";
import { NavigatorPanel } from "./components/NavigatorPanel";
import { SessionLog } from "./components/SessionLog";
import { useSession } from "./hooks/useSession";

export default function App() {
  const {
    messages,
    events,
    isRunning,
    activeAgent,
    workflowsRun,
    facts,
    elapsedMs,
    nextStep,
    thesisPath,
    persona,
    setPersona,
    verifiedSourcesOnly,
    setVerifiedSourcesOnly,
    send,
  } = useSession();

  return (
    <main className="shell">
      {/* 1. the chat - the only place the user types */}
      <ChatPanel
        messages={messages}
        isRunning={isRunning}
        elapsedMs={elapsedMs}
        nextStep={nextStep}
        facts={facts}
        workflowsRun={workflowsRun}
        onSend={send}
        persona={persona}
        onPersonaChange={setPersona}
        verifiedSourcesOnly={verifiedSourcesOnly}
        onVerifiedChange={setVerifiedSourcesOnly}
      />

      <div className="shell__side">
        {/* 2. where the run is in the graph */}
        <NavigatorPanel
          activeAgent={activeAgent}
          thesisPath={thesisPath}
          facts={facts}
        />

        {/* 3. what the run actually did */}
        <SessionLog events={events} />
      </div>
    </main>
  );
}
