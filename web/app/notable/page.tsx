export const metadata = { title: "Notable games" };

import Link from "next/link";
import { getNotableGames, type NotableEntry } from "@/lib/api";

function GameRow({ entry }: { entry: NotableEntry }) {
  const g = entry.game;
  const date = g.utcDate
    ? new Date(g.utcDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      })
    : "";
  return (
    <li className="border-t border-neutral-800/40 first:border-t-0">
      <Link
        href={`/games/${g.gameCode}`}
        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-neutral-800/40"
      >
        <span className="w-14 shrink-0 text-xs text-neutral-500">{date}</span>
        <span className="min-w-0 flex-1 truncate">
          {g.home.name}{" "}
          <span className="tabular-nums text-neutral-300">
            {g.home.score}–{g.away.score}
          </span>{" "}
          {g.away.name}
        </span>
        <span className="shrink-0 rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-orange-400">
          {entry.note}
        </span>
      </Link>
    </li>
  );
}

export default async function NotablePage() {
  const { categories } = await getNotableGames();

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Notable games</h1>
        <span className="text-sm text-neutral-400">
          The season&apos;s most memorable results
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {categories.map((cat) => (
          <div
            key={cat.key}
            className="rounded-lg border border-neutral-800 bg-neutral-900/40"
          >
            <h2 className="border-b border-neutral-800 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-neutral-300">
              {cat.label}
            </h2>
            <ol>
              {cat.entries.map((e) => (
                <GameRow key={`${cat.key}-${e.game.id}`} entry={e} />
              ))}
            </ol>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-neutral-500">
        Comebacks are computed from the play-by-play running score — the
        winner&apos;s largest deficit at any point in the game.
      </p>
    </div>
  );
}
