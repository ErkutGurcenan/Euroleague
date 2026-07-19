import Link from "next/link";
import { getPlayers, type PlayerSummary } from "@/lib/api";

const SORTS: Record<string, { label: string; key: keyof PlayerSummary }> = {
  pir: { label: "PIR", key: "pir" },
  pts: { label: "PTS", key: "points" },
  reb: { label: "REB", key: "rebounds" },
  ast: { label: "AST", key: "assists" },
  stl: { label: "STL", key: "steals" },
  blk: { label: "BLK", key: "blocks" },
  min: { label: "MIN", key: "minutes" },
};

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const params = await searchParams;
  const sortKey = SORTS[params.sort ?? "pir"] ? params.sort ?? "pir" : "pir";
  const { players, minGames } = await getPlayers();
  const sorted = [...players].sort(
    (a, b) => (b[SORTS[sortKey].key] as number) - (a[SORTS[sortKey].key] as number),
  );

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Players</h1>
        <span className="text-sm text-neutral-400">
          Per-game averages · min. {minGames} game{minGames === 1 ? "" : "s"}
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-3 py-2 text-right">GP</th>
              {Object.entries(SORTS).map(([k, s]) => (
                <th key={k} className="px-2 py-2 text-right">
                  <Link
                    href={`/players?sort=${k}`}
                    className={k === sortKey ? "text-orange-400" : "hover:text-white"}
                  >
                    {s.label}
                  </Link>
                </th>
              ))}
              <th className="px-2 py-2 text-right">2P%</th>
              <th className="px-2 py-2 text-right">3P%</th>
              <th className="px-2 py-2 text-right">FT%</th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 100).map((p, i) => (
              <tr
                key={p.playerCode}
                className="border-t border-neutral-800/60 hover:bg-neutral-900/60"
              >
                <td className="px-3 py-2 text-neutral-500">{i + 1}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/players/${p.playerCode}`}
                    className="font-medium hover:text-orange-400"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {p.club && (
                    <Link
                      href={`/teams/${p.club.code}`}
                      className="flex items-center gap-1.5 text-neutral-400 hover:text-white"
                    >
                      {p.club.crestUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.club.crestUrl}
                          alt=""
                          className="h-4 w-4 object-contain"
                        />
                      )}
                      {p.club.code}
                    </Link>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-neutral-400">
                  {p.gamesPlayed}
                </td>
                {Object.values(SORTS).map((s) => (
                  <td
                    key={s.key}
                    className={`px-2 py-2 text-right tabular-nums ${
                      s.key === SORTS[sortKey].key
                        ? "font-semibold text-white"
                        : "text-neutral-300"
                    }`}
                  >
                    {(p[s.key] as number).toFixed(1)}
                  </td>
                ))}
                <td className="px-2 py-2 text-right text-neutral-400">
                  {p.fg2Pct ?? "–"}
                </td>
                <td className="px-2 py-2 text-right text-neutral-400">
                  {p.fg3Pct ?? "–"}
                </td>
                <td className="px-2 py-2 text-right text-neutral-400">
                  {p.ftPct ?? "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
