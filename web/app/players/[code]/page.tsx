import Link from "next/link";
import { notFound } from "next/navigation";
import GameLogChart from "@/components/GameLogChart";
import ShotChartExplorer from "@/components/ShotChartExplorer";
import { getPlayer, getPlayerShots } from "@/lib/api";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-3 text-center">
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-xs uppercase text-neutral-500">{label}</div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  try {
    const player = await getPlayer(code);
    return { title: player.name };
  } catch {
    return {};
  }
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  let player, shotData;
  try {
    [player, shotData] = await Promise.all([getPlayer(code), getPlayerShots(code)]);
  } catch {
    notFound();
  }
  const a = player.averages;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        {player.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.imageUrl}
            alt=""
            className="h-20 w-20 rounded-full border border-neutral-800 object-cover"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold">
            {player.dorsal && (
              <span className="mr-2 text-neutral-500">#{player.dorsal}</span>
            )}
            {player.name}
          </h1>
          <p className="text-sm text-neutral-400">
            {player.club && (
              <Link
                href={`/teams/${player.club.code}`}
                className="text-orange-400 hover:underline"
              >
                {player.club.name}
              </Link>
            )}
            {player.positionName && ` · ${player.positionName}`}
            {player.heightCm && ` · ${player.heightCm} cm`}
            {player.country && ` · ${player.country}`}
          </p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-3 sm:grid-cols-6">
        <StatCard label="Games" value={a.gamesPlayed} />
        <StatCard label="Min" value={a.minutes} />
        <StatCard label="Pts" value={a.points} />
        <StatCard label="Reb" value={a.rebounds} />
        <StatCard label="Ast" value={a.assists} />
        <StatCard label="PIR" value={a.pir} />
      </div>

      {player.gameLog.length >= 2 && (
        <div className="mb-8 grid max-w-4xl grid-cols-1 gap-3 lg:grid-cols-2">
          <GameLogChart
            title="Points by game"
            unit="pts"
            entries={player.gameLog.map((g) => ({
              value: g.points ?? 0,
              won: g.won,
              label: `R${g.round} ${g.home ? "vs" : "@"} ${
                g.opponent?.abbreviatedName ?? "?"
              }`,
            }))}
          />
          <GameLogChart
            title="PIR by game"
            unit="PIR"
            entries={player.gameLog.map((g) => ({
              value: g.pir ?? 0,
              won: g.won,
              label: `R${g.round} ${g.home ? "vs" : "@"} ${
                g.opponent?.abbreviatedName ?? "?"
              }`,
            }))}
          />
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">Shooting</h2>
      <div className="mb-4 grid max-w-md grid-cols-3 gap-3">
        <StatCard label="2P%" value={a.fg2Pct ?? "–"} />
        <StatCard label="3P%" value={a.fg3Pct ?? "–"} />
        <StatCard label="FT%" value={a.ftPct ?? "–"} />
      </div>
      <div className="mb-8">
        <ShotChartExplorer shots={shotData.shots} />
      </div>

      <h2 className="mb-3 text-lg font-semibold">Game log</h2>
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-3 py-2">Rd</th>
              <th className="px-3 py-2">Opponent</th>
              <th className="px-2 py-2 text-right">Min</th>
              <th className="px-2 py-2 text-right">Pts</th>
              <th className="px-2 py-2 text-right">Reb</th>
              <th className="px-2 py-2 text-right">Ast</th>
              <th className="px-2 py-2 text-right">2P</th>
              <th className="px-2 py-2 text-right">3P</th>
              <th className="px-2 py-2 text-right">FT</th>
              <th className="px-2 py-2 text-right">PIR</th>
              <th className="px-2 py-2 text-right">+/−</th>
            </tr>
          </thead>
          <tbody>
            {player.gameLog.map((g) => (
              <tr key={g.gameCode} className="border-t border-neutral-800/60">
                <td className="px-3 py-2 text-neutral-500">{g.round}</td>
                <td className="px-3 py-2">
                  {g.opponent ? (
                    <Link
                      href={`/teams/${g.opponent.code}`}
                      className="hover:text-orange-400"
                    >
                      {g.home ? "vs" : "@"} {g.opponent.abbreviatedName}
                    </Link>
                  ) : (
                    "–"
                  )}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {g.minutes}
                </td>
                <td className="px-2 py-2 text-right font-medium tabular-nums">
                  {g.points}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{g.rebounds}</td>
                <td className="px-2 py-2 text-right tabular-nums">{g.assists}</td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {g.fg2}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {g.fg3}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {g.ft}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{g.pir}</td>
                <td
                  className={`px-2 py-2 text-right tabular-nums ${
                    (g.plusMinus ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {g.plusMinus ?? "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        vs = home game · @ = away game
      </p>
    </div>
  );
}
