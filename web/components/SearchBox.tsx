"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Headshot from "@/components/Headshot";
import type { SearchResults } from "@/lib/api";

const EMPTY: SearchResults = { clubs: [], players: [] };

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(EMPTY);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          setResults(await res.json());
          setOpen(true);
        }
      } catch {
        /* aborted or offline — keep previous results */
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };
  const hasResults = results.clubs.length > 0 || results.players.length > 0;

  return (
    <div ref={boxRef} className="relative">
      <input
        type="search"
        value={query}
        placeholder="Search…"
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="w-44 rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-sm placeholder-neutral-500 outline-none transition-all focus:w-64 focus:border-orange-600 sm:w-56"
      />
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-md border border-neutral-700 bg-neutral-900 shadow-xl">
          {!hasResults && (
            <p className="px-3 py-2 text-sm text-neutral-500">No results</p>
          )}
          {results.clubs.length > 0 && (
            <div className="border-b border-neutral-800 py-1">
              {results.clubs.map((c) => (
                <button
                  key={c.code}
                  onClick={() => go(`/teams/${c.code}`)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-neutral-800"
                >
                  {c.crestUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.crestUrl}
                      alt=""
                      className="h-4 w-4 object-contain"
                    />
                  )}
                  {c.name}
                </button>
              ))}
            </div>
          )}
          {results.players.map((p) => (
            <button
              key={p.playerCode}
              onClick={() => go(`/players/${p.playerCode}`)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-neutral-800"
            >
              <Headshot src={p.imageUrl} name={p.name} size={20} />
              <span className="min-w-0 truncate">
                {p.name}
                {p.clubName && (
                  <span className="ml-1 text-xs text-neutral-500">
                    {p.clubName}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
