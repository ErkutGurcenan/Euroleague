export const metadata = { title: "Season highs" };

import Link from "next/link";
import { getHighs } from "@/lib/api";

export default async function HighsPage() {
  const { categories } = await getHighs();

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Season highs</h1>
        <span className="text-sm text-neutral-400">
          Best single-game performances
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <div
            key={cat.key}
            className="rounded-lg border border-neutral-800 bg-neutral-900/40"
          >
            <h2 className="border-b border-neutral-800 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-neutral-300">
              {cat.label}
            </h2>
            <ol>
              {cat.entries.map((e, i) => (
                <li
                  key={`${e.playerCode}-${e.gameCode}`}
                  className="flex items-center gap-2 border-t border-neutral-800/40 px-4 py-1.5 text-sm first:border-t-0"
                >
                  <span className="w-5 text-right tabular-nums text-neutral-600">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link
                      href={`/players/${e.playerCode}`}
                      className="hover:text-orange-400"
                    >
                      {e.name}
                    </Link>
                    <Link
                      href={`/games/${e.gameCode}`}
                      className="ml-1.5 text-xs text-neutral-500 hover:text-orange-400"
                    >
                      {e.clubCode} vs {e.opponent} · R{e.round}
                    </Link>
                  </span>
                  <span className="text-base font-bold tabular-nums">
                    {e.value}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
