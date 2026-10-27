/**
 * One figure from an answer, loaded on its own.
 *
 * Each instance is an independent <img>, so several figures load in parallel
 * and none of them holds up the text around it. A figure the backend does not
 * have -- an unknown name, or the Netlify demo, which has no experiments --
 * says so in place rather than leaving a broken-image icon.
 */

import { useState } from "react";

import { figureUrl } from "../api/client";
import { figureLabel } from "../lib/figures";
import "../styles/rich.css";

export function FigureImage({ name }: { name: string }) {
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const label = figureLabel(name);

  return (
    <figure className={`fig rich fig--${state}`}>
      {state !== "missing" && (
        <img
          src={figureUrl(name)}
          alt={`Figure ${label}`}
          onLoad={() => setState("ready")}
          onError={() => setState("missing")}
        />
      )}
      {state === "loading" && <div className="fig__status">Loading figure…</div>}
      {state === "missing" && (
        <div className="fig__status">
          Figure unavailable: the backend has no <code>{name}</code>.
        </div>
      )}
      <figcaption className="fig__caption">{label}</figcaption>
    </figure>
  );
}
