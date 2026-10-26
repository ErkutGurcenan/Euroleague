"use client";

import { useState } from "react";
import type { SeasonInfo } from "@/lib/api";

export default function SeasonSelect({
  seasons,
  current,
}: {
  seasons: SeasonInfo[];
  current: string;
}) {
  const [picked, setPicked] = useState<string | null>(null);

  // A full page reload, not router.refresh(): an in-place refresh queues behind
  // the page's link prefetches (73 requests on Standings) and could take over a
  // minute, while a reload asks for the page first (about 1-3 s).
  const onChange = (code: string) => {
    document.cookie = `season=${code}; path=/; max-age=31536000; samesite=lax`;
    setPicked(code);
    window.location.reload();
  };

  if (seasons.length <= 1) {
    return (
      <span className="text-xs text-neutral-500">
        {seasons[0]?.label ?? ""}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <select
        value={picked ?? current}
        onChange={(e) => onChange(e.target.value)}
        disabled={picked !== null}
        aria-busy={picked !== null}
        className="rounded-md border border-neutral-700 bg-neutral-900 px-1.5 py-1 text-xs text-neutral-300 outline-none focus:border-orange-600 disabled:opacity-70"
        aria-label="Season"
      >
        {seasons.map((s) => (
          <option key={s.code} value={s.code}>
            {s.label}
            {s.note ? " ⚠" : ""}
          </option>
        ))}
      </select>
      {picked && (
        <span role="status" className="animate-pulse text-xs text-neutral-400">
          Loading…
        </span>
      )}
    </span>
  );
}
