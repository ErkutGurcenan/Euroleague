"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SearchResults } from "@/lib/api";

export default function TeamPicker({
  slot,
  currentName,
}: {
  slot: "a" | "b";
  currentName: string | null;
}) {
  const [query, setQuery] = useState("");
  const [clubs, setClubs] = useState<SearchResults["clubs"]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setClubs([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data: SearchResults = await res.json();
          setClubs(data.clubs);
          setOpen(true);
        }
      } catch {
        /* aborted */
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

  const pick = (code: string) => {
    setOpen(false);
    setQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.set(slot, code);
    router.push(`/compare/teams?${params.toString()}`);
  };

  return (
    <div ref={boxRef} className="relative">
      <input
        type="search"
        value={query}
        placeholder={currentName ?? "Search a team…"}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm placeholder-neutral-400 outline-none focus:border-orange-600"
      />
      {open && clubs.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-neutral-700 bg-neutral-900 shadow-xl">
          {clubs.map((c) => (
            <button
              key={c.code}
              onClick={() => pick(c.code)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-neutral-800"
            >
              {c.crestUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.crestUrl} alt="" className="h-4 w-4 object-contain" />
              )}
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
