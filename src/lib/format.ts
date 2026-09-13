/**
 * Small formatting helpers shared by the panels.
 */

/** 12:04:31 - the clock column of a log line. */
export function clock(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

/** Short, stable session id - enough to tell two demo runs apart. */
export function newSessionId(): string {
  return `s-${Date.now().toString(36)}`;
}
