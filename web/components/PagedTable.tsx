"use client";

import { useState, type ReactNode } from "react";

const BUTTON =
  "rounded-md border border-neutral-700 px-2.5 py-1 text-neutral-300 hover:border-neutral-500 hover:text-white "
  + "disabled:cursor-default disabled:opacity-35 disabled:hover:border-neutral-700 disabled:hover:text-neutral-300";

/** A table shown a page at a time, newest rows first. The rows are rendered
    on the server; only the page switching runs in the browser. */
export default function PagedTable({ head, rows, perPage = 10 }: { head: ReactNode; rows: ReactNode[]; perPage?: number }) {
  const [page, setPage] = useState(0);
  const pages = Math.ceil(rows.length / perPage);
  const first = page * perPage;
  const last = Math.min(rows.length, first + perPage);
  return (
    <div className="grid gap-2">
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full whitespace-nowrap text-sm">
          {head}
          <tbody>{rows.slice(first, last)}</tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
          <span>{`Games ${first + 1}–${last} of ${rows.length}, newest first`}</span>
          <div className="flex items-center gap-1.5 text-sm">
            <button type="button" className={BUTTON} disabled={page === 0} onClick={() => setPage(page - 1)}>
              ← Newer
            </button>
            <span className="px-1 text-xs">{`Page ${page + 1} of ${pages}`}</span>
            <button type="button" className={BUTTON} disabled={page === pages - 1} onClick={() => setPage(page + 1)}>
              Older →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
