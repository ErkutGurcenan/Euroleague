export const metadata = { title: "All-time leaders" };

import Link from "next/link";
import Headshot from "@/components/Headshot";
import { getAllTimeLeaders, type AllTimeCategory } from "@/lib/api";

function CategoryCard({ cat }: { cat: AllTimeCategory }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40">
      <h3 className="border-b border-neutral-800 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-neutral-300">
        {cat.label}
      </h3>
      <ol>
        {cat.entries.map((e, i) => (
          <li
            key={e.playerCode}
            className="flex items-center gap-2 border-t border-neutral-800/40 px-3 py-1.5 text-sm first:border-t-0"
          >
            <span className="w-4 text-right text-xs tabular-nums text-neutral-600">
              {i + 1}
            </span>
            <Headshot src={e.imageUrl} name={e.name} size={24} />
            <Link
              href={`/players/${e.playerCode}/career`}
              className="min-w-0 flex-1 truncate hover:text-orange-400"
            >
              {e.name}
              <span className="ml-1 text-xs text-neutral-600">
                {e.seasonsPlayed}s
              </span>
            </Link>
            <span className="font-bold tabular-nums">
              {cat.rate ? e.value.toFixed(1) : e.value.toLocaleString()}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default async function AllTimePage() {
  const { totals, averages, minGames } = await getAllTimeLeaders();

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">All-time leaders</h1>
        <span className="text-sm text-neutral-400">
          Career totals across 10 seasons (2016-17 →)
        </span>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Career totals</h2>
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {totals.map((cat) => (
          <CategoryCard key={cat.key} cat={cat} />
        ))}
      </div>

      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Career per-game</h2>
        <span className="text-xs text-neutral-500">min. {minGames} games</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {averages.map((cat) => (
          <CategoryCard key={cat.key} cat={cat} />
        ))}
      </div>
      <p className="mt-3 text-xs text-neutral-500">
        Since 2016-17 (start of the current single-league era). Names link to
        career pages.
      </p>
    </div>
  );
}
