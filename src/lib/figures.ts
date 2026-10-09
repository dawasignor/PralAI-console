/**
 * Figure placeholders in an Argus answer.
 *
 * Argus writes `<image - kelani-2025-bui>` where a figure belongs: the
 * experiment (`region-year`) and the figure name. The reply is split here into
 * text and figure parts. Text goes through `renderMarkdown` as before; each
 * figure becomes its own <img>, so the answer shows at once and the images
 * load beside it, in parallel, from `GET /api/figure/<name>`.
 *
 * Split on the raw text, BEFORE markdown escaping -- after it, the angle
 * brackets are `&lt;` and the placeholder no longer exists. Nothing else from
 * the model bypasses the escaping: a figure part carries only a name, and the
 * name must match NAME before it is ever put in a URL.
 */

const PLACEHOLDER = /<image\s*-\s*([A-Za-z0-9_-]+)\s*>/g;

/**
 * region-year-figure, or run-region-year-figure for a raster the run itself
 * just wrote -- the same rules as core/figure_refs.py.
 */
const NAME = /^(run-)?[a-z]+-\d{4}-[a-z0-9][a-z0-9_]{0,63}$/;

export type ReplyPart =
  | { kind: "text"; text: string }
  | { kind: "figure"; name: string };

export function splitFigures(text: string): ReplyPart[] {
  const parts: ReplyPart[] = [];
  let last = 0;
  for (const match of text.matchAll(PLACEHOLDER)) {
    const name = match[1].toLowerCase();
    // A malformed name stays in the text, escaped, where the reader can see
    // it -- dropping it would hide that Argus tried to show something.
    if (!NAME.test(name)) continue;
    const start = match.index ?? 0;
    if (start > last) parts.push({ kind: "text", text: text.slice(last, start) });
    parts.push({ kind: "figure", name });
    last = start + match[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts.filter((p) => p.kind === "figure" || p.text.trim());
}

/**
 * `kelani-2025-ndvi_class` -> "kelani-2025 · ndvi_class", and
 * `run-kelani-2025-bui` -> "kelani-2025 · bui · this run", for the caption.
 */
export function figureLabel(name: string): string {
  const match = /^(run-)?([a-z]+-\d{4})-(.+)$/.exec(name);
  if (!match) return name;
  return `${match[2]} · ${match[3]}${match[1] ? " · this run" : ""}`;
}
