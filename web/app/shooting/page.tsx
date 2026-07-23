export const metadata = { title: "Shooting leaders" };

import Link from "next/link";
import Headshot from "@/components/Headshot";
import PlayersToggle from "@/components/PlayersToggle";
import { getShootingLeaders } from "@/lib/api";
import { currentSeason } from "@/lib/season";

export default async function ShootingPage() {
  const { categories } = await getShootingLeaders(await currentSeason());

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Shooting</h1>
          <PlayersToggle active="shooting" />
        </div>
        <span className="hidden text-sm text-neutral-400 sm:inline">
          efficiency · qualified players
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <div
            key={cat.key}
            className="rounded-lg border border-neutral-800 bg-neutral-900/40"
          >
            <div className="border-b border-neutral-800 px-4 py-2.5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-300">
                {cat.label}
              </h2>
              <span className="text-xs text-neutral-500">{cat.sub}</span>
            </div>
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
                  </Link>
                  <span className="text-xs text-neutral-500">{e.detail}</span>
                  <span className="w-12 text-right font-bold tabular-nums">
                    {e.value}%
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-neutral-500">
        True shooting and effective FG% weight threes and free throws. Player
        names link to career pages.
      </p>
    </div>
  );
}
