export const metadata = { title: "Referees" };

import { getReferees, type RefereeEntry } from "@/lib/api";
import { currentSeason } from "@/lib/season";

function Highlight({
  label,
  referee,
  value,
}: {
  label: string;
  referee: RefereeEntry | undefined;
  value: string;
}) {
  if (!referee) return null;
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-3">
      <div className="text-xs uppercase text-neutral-500">{label}</div>
      <div className="mt-0.5 truncate font-semibold">{referee.name}</div>
      <div className="text-sm text-neutral-400">{value}</div>
    </div>
  );
}

export default async function RefereesPage() {
  const { referees, minGames } = await getReferees(await currentSeason());

  const mostGames = referees[0];
  const highestScoring = [...referees].sort(
    (a, b) => b.avgPoints - a.avgPoints,
  )[0];
  const tightest = [...referees]
    .filter((r) => r.avgFouls !== null)
    .sort((a, b) => (b.avgFouls ?? 0) - (a.avgFouls ?? 0))[0];

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Referees</h1>
        <span className="text-sm text-neutral-400">
          How games are officiated · min. {minGames} games
        </span>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Highlight
          label="Most games"
          referee={mostGames}
          value={`${mostGames?.games} games`}
        />
        <Highlight
          label="Highest scoring"
          referee={highestScoring}
          value={`${highestScoring?.avgPoints} pts/game`}
        />
        <Highlight
          label="Tightest whistle"
          referee={tightest}
          value={`${tightest?.avgFouls} fouls/game`}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-3 py-2">Referee</th>
              <th className="px-3 py-2 text-right">Games</th>
              <th className="px-3 py-2 text-right">Home win %</th>
              <th className="px-3 py-2 text-right">Avg points</th>
              <th className="px-3 py-2 text-right">Fouls/gm</th>
            </tr>
          </thead>
          <tbody>
            {referees.map((r) => (
              <tr key={r.code} className="border-t border-neutral-800/60">
                <td className="px-3 py-2">
                  {r.name}
                  {r.country && (
                    <span className="ml-1.5 text-xs text-neutral-500">
                      {r.country}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{r.games}</td>
                <td className="px-3 py-2 text-right tabular-nums text-neutral-400">
                  {r.homeWinPct}%
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.avgPoints}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-neutral-400">
                  {r.avgFouls ?? "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-neutral-500">
        Each game lists three referees; every stat counts a game once per
        official on it. Home win % shows whether games under a crew skew home.
      </p>
    </div>
  );
}
