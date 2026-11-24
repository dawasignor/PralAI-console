/**
 * Export the conversation as a PDF, exactly as it reads on screen.
 *
 * The browser's own print engine does the work, through the print stylesheet
 * in global.css: the chat is laid out at full length, the side panels and the
 * composer are left out, and the console's colours are kept. That gives real
 * text in the PDF -- selectable, searchable, sharp at any zoom -- and the
 * figures at their full resolution, which a screenshot-to-PDF library cannot,
 * and it adds no dependency.
 *
 * Every figure is loaded before the dialog opens: a figure still arriving is
 * a zero-height box on screen, and would print as a gap. The PDF is named
 * after the document title, so the title is set for the duration of the
 * print and put back afterwards.
 */

import { useState } from "react";

interface Props {
  /** False until there is at least one exchange to export. */
  enabled: boolean;
}

/** Longest wait for figures before printing anyway; a stuck one prints as
 *  its "Loading figure" box rather than holding the export forever. */
const FIGURE_WAIT_MS = 20_000;

function figuresLoaded(): Promise<void> {
  const pending = Array.from(
    document.querySelectorAll<HTMLImageElement>(".chat__stream img"),
  ).filter((img) => !img.complete);
  if (!pending.length) return Promise.resolve();
  const all = Promise.all(
    pending.map(
      (img) =>
        new Promise<void>((done) => {
          img.addEventListener("load", () => done(), { once: true });
          img.addEventListener("error", () => done(), { once: true });
        }),
    ),
  ).then(() => undefined);
  const timeout = new Promise<void>((done) => window.setTimeout(done, FIGURE_WAIT_MS));
  return Promise.race([all, timeout]);
}

/** `Argos chat 2026-10-14 16-05` -- the PDF's default file name. */
function fileTitle(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `Argos chat ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}-${pad(now.getMinutes())}`
  );
}

export function ExportPdfButton({ enabled }: Props) {
  const [preparing, setPreparing] = useState(false);

  async function exportPdf() {
    if (!enabled || preparing) return;
    setPreparing(true);
    await figuresLoaded();
    // Two frames, so React has painted any figure that just turned "ready"
    // before the print engine takes its snapshot of the layout.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const previous = document.title;
    document.title = fileTitle();
    const restore = () => {
      document.title = previous;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    setPreparing(false);
    window.print();
  }

  return (
    <button
      type="button"
      className="copy"
      onClick={exportPdf}
      disabled={!enabled || preparing}
      title={
        enabled
          ? "Export the whole conversation, text and figures, as a PDF. Choose \"Save as PDF\" in the print dialog."
          : "No exchanges yet"
      }
      aria-live="polite"
    >
      <span className="copy__icon" aria-hidden="true">⤓</span>
      {preparing ? "Loading figures…" : "Export PDF"}
    </button>
  );
}
