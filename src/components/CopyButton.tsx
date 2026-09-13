/**
 * Copy-to-clipboard, with the feedback that makes it trustworthy.
 *
 * A copy button that looks identical before and after the click leaves the
 * user guessing, so this one says what happened: "Copied" on success, "Copy
 * failed" on refusal, and back to its label after a moment.
 *
 * The text is produced by a callback rather than passed in, so a long
 * transcript is only built when someone actually asks for it -- not on every
 * render of a chat that is still growing.
 */

import { useEffect, useRef, useState } from "react";

type State = "idle" | "copied" | "failed";

interface Props {
  /** Builds the text at click time. Returning "" disables the button. */
  getText: () => string;
  label: string;
  title: string;
  /** Shown instead of the label when there is nothing to copy. */
  emptyTitle?: string;
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    // Needs a secure context; localhost counts, so dev works.
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for an insecure origin or a browser that refuses the API. Ugly,
    // deprecated, and still the only thing that works in those cases.
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

export function CopyButton({ getText, label, title, emptyTitle }: Props) {
  const [state, setState] = useState<State>("idle");
  const timer = useRef<number>();

  // A click just before unmount would otherwise set state on a dead component.
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const text = getText();
  const empty = text.length === 0;

  async function copy() {
    if (empty) return;
    const ok = await writeClipboard(text);
    setState(ok ? "copied" : "failed");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1600);
  }

  return (
    <button
      type="button"
      className={`copy copy--${state}`}
      onClick={copy}
      disabled={empty}
      title={empty ? emptyTitle ?? "Nothing to copy yet" : title}
      // The label changes on success, so screen readers are told too rather
      // than being left with a button whose name silently shifted.
      aria-live="polite"
    >
      <span className="copy__icon" aria-hidden="true">
        {state === "copied" ? "✓" : state === "failed" ? "!" : "⧉"}
      </span>
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}
    </button>
  );
}
