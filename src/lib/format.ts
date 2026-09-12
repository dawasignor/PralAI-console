/**
 * Small formatting helpers shared by the panels.
 */

/** 12:04:31 - the clock column of a log line. */
export function clock(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

/**
 * The tiniest possible markdown: **bold** and _italic_ only.
 *
 * Stubbed replies use just those two, so pulling in a markdown library would
 * be more dependency than the job needs. Text is escaped first, so a reply can
 * never inject markup.
 *
 * TODO(v2): swap for a real markdown renderer once replies carry tables and
 * links from the backend.
 */
export function miniMarkdown(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>");
}

/** Short, stable session id - enough to tell two demo runs apart. */
export function newSessionId(): string {
  return `s-${Date.now().toString(36)}`;
}
