/**
 * One table from an answer, loaded on its own -- the table twin of FigureImage.
 *
 * `<table - t-0123456789ab>` in a reply becomes this. The table is DATA served
 * by `GET /api/table/<id>` (core/tables.py): columns, rows, caption, source.
 * It is drawn as a real HTML table on a white card, so a reader can select
 * and copy the numbers, and nothing a model wrote is in it -- the backend
 * built it from a stored result. Every cell is text; nothing is rendered as
 * markup.
 */

import { useEffect, useState } from "react";

import { tableUrl } from "../api/client";
import "../styles/rich.css";

interface TableData {
  key: string;
  title: string;
  columns: string[];
  rows: (string | number | null)[][];
  caption?: string;
  source?: string;
  notes?: string[];
  numeric?: boolean[];
}

function cell(v: string | number | null): string {
  if (v === null || v === undefined) return "--";
  if (typeof v === "number") {
    return Number.isInteger(v) ? v.toLocaleString("en-GB") : String(Number(v.toFixed(4)));
  }
  return v;
}

export function TableBlock({ id }: { id: string }) {
  const [data, setData] = useState<TableData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let live = true;
    fetch(tableUrl(id))
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((json: TableData) => {
        if (live) {
          setData(json);
          setState("ready");
        }
      })
      .catch(() => live && setState("missing"));
    return () => {
      live = false;
    };
  }, [id]);

  if (state !== "ready" || !data) {
    return (
      <div className={`rich rich--${state}`}>
        <div className="rich__status">
          {state === "loading" ? "Loading table…" : `Table unavailable: the backend has no ${id}.`}
        </div>
      </div>
    );
  }

  return (
    <figure className="rich rich--ready" data-table={data.key}>
      <figcaption className="rich__title">{data.title}</figcaption>
      <div className="rich__scroll">
        <table className="rich-table">
          <thead>
            <tr>
              {data.columns.map((c, i) => (
                <th key={i}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, r) => (
              <tr key={r}>
                {row.map((v, c) => (
                  <td key={c} className={data.numeric?.[c] ? "num" : undefined}>
                    {cell(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.notes && data.notes.length > 0 && (
        <ul className="rich__notes">
          {data.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
      {(data.caption || data.source) && (
        <div className="rich__caption">
          {data.caption}
          {data.source ? ` Source: ${data.source}.` : ""}
        </div>
      )}
    </figure>
  );
}
