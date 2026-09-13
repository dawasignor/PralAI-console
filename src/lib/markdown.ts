/**
 * The markdown the agents actually write, rendered.
 *
 * Replaces the two-rule `miniMarkdown`, which showed `### Ranked actions` and
 * `| Rank | Action |` to the reader as literal text. The agents emit headings,
 * tables, lists and backticked identifiers, so the console has to read them.
 *
 * **Escape first, then add only the tags chosen here.** The text comes from a
 * model, and nothing it writes can introduce markup: every `<`, `>` and `&` is
 * neutralised before a single rule runs. That is why this is hand-rolled
 * rather than a markdown library plus a sanitiser -- the safety property is the
 * whole design, not a dependency to configure.
 *
 * Deliberately NOT supported: raw HTML, images, and links. A link in a chat
 * bubble sourced from a model is a phishing surface, and none of the agents
 * needs one -- they cite sources by name, and the full reference travels in the
 * sources block.
 */

const ESCAPES: Array<[RegExp, string]> = [
  [/&/g, "&amp;"],
  [/</g, "&lt;"],
  [/>/g, "&gt;"],
];

function escapeHtml(text: string): string {
  return ESCAPES.reduce((out, [from, to]) => out.replace(from, to), text);
}

/**
 * Bold, italic and inline code, in that order and no other.
 *
 * Code spans are pulled out first and put back last, so an identifier like
 * `min_valid_fraction` cannot be chewed up by the italic rule on its way
 * through.
 */
function inline(text: string): string {
  const code: string[] = [];
  // A NUL sentinel: a plain placeholder like " 3 " collides with ordinary
  // prose -- "in 3 days" would come back as a code span. Model output never
  // contains NUL.
  let out = text.replace(/`([^`]+)`/g, (_m, body: string) => {
    code.push(body);
    return `\u0000${code.length - 1}\u0000`;
  });

  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");

  // Underscore italics only when the underscores sit at a word boundary.
  // Without that guard `fetch_weather_data` renders as fetch<em>weather</em>
  // data -- and this project is full of snake_case workflow names.
  out = out.replace(
    /(^|[\s(])_([^_\n]+)_(?=$|[\s.,;:!?)])/g,
    "$1<em>$2</em>",
  );

  return out.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => `<code>${code[+i]}</code>`);
}

/** Is this the `|---|:---:|` row that turns the line above into a table head? */
function isTableRule(line: string): boolean {
  return /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes("-");
}

function cells(row: string): string[] {
  return row.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|")
    .map((cell) => cell.trim());
}

/**
 * Render a reply to HTML.
 *
 * Block-level first (headings, tables, lists, rules, paragraphs), inline rules
 * inside each block.
 */
export function renderMarkdown(text: string): string {
  const lines = escapeHtml(text).split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length) {
      html.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (!line.trim()) {
      flush();
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      // Capped at h4: these sit inside a chat bubble, and an h1 there competes
      // with the panel's own title.
      const level = Math.min(heading[1].length + 1, 4);
      html.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      continue;
    }

    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      flush();
      html.push("<hr />");
      continue;
    }

    // A table needs its separator row; a lone pipe line is just prose.
    if (line.trim().startsWith("|") && isTableRule(lines[i + 1] ?? "")) {
      flush();
      const head = cells(line);
      const body: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        body.push(cells(lines[i]));
        i += 1;
      }
      i -= 1;

      const headRow = head.map((c) => `<th>${inline(c)}</th>`).join("");
      const bodyRows = body
        .map((row) => `<tr>${row.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
        .join("");
      // Wrapped so a wide table scrolls inside the bubble instead of pushing
      // the whole page sideways.
      html.push(
        `<div class="md-table"><table><thead><tr>${headRow}</tr></thead>` +
          `<tbody>${bodyRows}</tbody></table></div>`,
      );
      continue;
    }

    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*(\d+)\.\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flush();
      const ordered = Boolean(numbered);
      const items: string[] = [];
      // `start` keeps a list that opens at 2. numbering from silently
      // restarting at 1.
      const start = numbered ? Number(numbered[1]) : 1;

      while (i < lines.length) {
        const item = ordered
          ? /^\s*\d+\.\s+(.*)$/.exec(lines[i])
          : /^\s*[-*]\s+(.*)$/.exec(lines[i]);
        if (!item) break;
        items.push(`<li>${inline(item[1].trim())}</li>`);
        i += 1;
      }
      i -= 1;

      html.push(
        ordered
          ? `<ol${start !== 1 ? ` start="${start}"` : ""}>${items.join("")}</ol>`
          : `<ul>${items.join("")}</ul>`,
      );
      continue;
    }

    paragraph.push(line.trim());
  }

  flush();
  return html.join("\n");
}
