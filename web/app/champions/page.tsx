export const metadata = { title: "Champions" };

import Link from "next/link";
import { getChampions } from "@/lib/api";

export default async function ChampionsPage() {
  const { titlesByClub, finals, canceled } = await getChampions();
  const maxTitles = Math.max(1, ...titlesByClub.map((t) => t.titles));

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Champions</h1>
        <span className="text-sm text-neutral-400">
          EuroLeague finals since 2016-17
        </span>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Titles by club</h2>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {titlesByClub.map((t) => (
          <Link
            key={t.code}
            href={`/teams/${t.code}`}
            className={`flex flex-col items-center gap-1 rounded-lg border bg-neutral-900/40 px-3 py-4 text-center transition-colors hover:border-orange-600/50 ${
              t.titles === maxTitles
                ? "border-orange-600/40"
                : "border-neutral-800"
            }`}
          >
            {t.crestUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.crestUrl} alt="" className="h-10 w-10 object-contain" />
            )}
            <span className="text-2xl font-bold tabular-nums">{t.titles}</span>
            <span className="truncate text-xs text-neutral-400">{t.code}</span>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 text-lg font-semibold">Finals</h2>
      <div className="space-y-2">
        {finals.map((f) => (
          <Link
            key={f.season}
            href={`/games/${f.gameCode}`}
            className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-3 transition-colors hover:border-orange-600/50"
          >
            <span className="w-16 shrink-0 text-sm text-neutral-400">
              {f.seasonLabel}
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {f.champion.crestUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.champion.crestUrl}
                  alt=""
                  className="h-7 w-7 shrink-0 object-contain"
                />
              )}
              <span className="min-w-0 truncate font-semibold">
                {f.champion.name}
              </span>
              <span className="shrink-0 rounded bg-neutral-800 px-2 py-0.5 text-xs tabular-nums text-neutral-300">
                {f.championScore}–{f.runnerUpScore}
              </span>
              <span className="min-w-0 truncate text-sm text-neutral-500">
                {f.runnerUp.name}
              </span>
            </div>
            {f.finalFourMvp?.name && (
              <span className="hidden shrink-0 text-xs text-neutral-500 sm:block">
                F4 MVP: {f.finalFourMvp.name}
              </span>
            )}
          </Link>
        ))}
        {canceled.map((c) => (
          <div
            key={c.season}
            className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/20 px-4 py-3"
          >
            <span className="w-16 shrink-0 text-sm text-neutral-500">
              {c.seasonLabel}
            </span>
            <span className="text-sm italic text-neutral-500">{c.note}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-neutral-500">
        Champion in bold, runner-up after the score. Rows link to the final.
      </p>
    </div>
  );
}
