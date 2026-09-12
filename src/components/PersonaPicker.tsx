/**
 * The persona picker - the button and popup at the bottom of the chat.
 *
 * Behaves the way a model selector does: a small button showing the current
 * choice, a popup listing the options with what each one changes, a tick on the
 * active one. Closes on Escape, on an outside click, and on choosing.
 */

import { useEffect, useRef, useState } from "react";

import type { PersonaId } from "../api/types";
import { PERSONAS, personaInfo } from "../lib/personas";

interface Props {
  persona: PersonaId;
  onChange: (persona: PersonaId) => void;
  disabled: boolean;
}

export function PersonaPicker({ persona, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = personaInfo(persona);

  // Close on Escape or a click outside. Bound only while the popup is open, so
  // the listeners are not sitting on the document for the whole session.
  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div className="picker" ref={rootRef}>
      <button
        type="button"
        className="picker__button"
        onClick={() => setOpen((was) => !was)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="picker__dot" />
        {current.name}
        <span className="picker__caret" aria-hidden="true">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="picker__menu" role="menu" aria-label="Persona">
          <p className="picker__heading">
            Persona - changes the voice, not the findings
          </p>

          {PERSONAS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`picker__item ${
                option.id === persona ? "picker__item--on" : ""
              }`}
              role="menuitemradio"
              aria-checked={option.id === persona}
              onClick={() => {
                onChange(option.id);
                setOpen(false);
              }}
            >
              <span className="picker__tick" aria-hidden="true">
                {option.id === persona ? "✓" : ""}
              </span>
              <span>
                <span className="picker__name">{option.name}</span>
                <span className="picker__tagline">{option.tagline}</span>
                <span className="picker__behaviour">{option.behaviour}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
