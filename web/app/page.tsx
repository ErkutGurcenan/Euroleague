import Link from "next/link";
import { getStandings } from "@/lib/api";

export default async function StandingsPage() {
  const { round, standings } = await getStandings();

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Standings</h1>
        <span className="text-sm text-neutral-400">
          Regular season · after Round {round}
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-3 py-2 text-right">W</th>
              <th className="px-3 py-2 text-right">L</th>
              <th className="px-3 py-2 text-right">Home</th>
              <th className="px-3 py-2 text-right">Away</th>
              <th className="px-3 py-2 text-right">PF</th>
              <th className="px-3 py-2 text-right">PA</th>
              <th className="px-3 py-2 text-right">+/−</th>
              <th className="px-3 py-2">Form</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => (
              <tr
                key={row.club.code}
                className="border-t border-neutral-800/60 hover:bg-neutral-900/60"
              >
                <td
                  className={`border-l-2 px-3 py-2 tabular-nums ${
                    row.position <= 6
                      ? "border-emerald-500 text-emerald-400"
                      : row.position <= 10
                        ? "border-amber-500 text-amber-400"
                        : "border-transparent text-neutral-400"
                  }`}
                >
                  {row.position}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/teams/${row.club.code}`}
                    className="flex items-center gap-2 hover:text-orange-400"
                  >
                    {row.club.crestUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.club.crestUrl}
                        alt=""
                        className="h-5 w-5 object-contain"
                      />
                    )}
                    {row.club.name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {row.gamesWon}
                </td>
                <td className="px-3 py-2 text-right text-neutral-400">
                  {row.gamesLost}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-neutral-400">
                  {row.home}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-neutral-400">
                  {row.away}
                </td>
                <td className="px-3 py-2 text-right text-neutral-400">
                  {row.pointsFavour}
                </td>
                <td className="px-3 py-2 text-right text-neutral-400">
                  {row.pointsAgainst}
                </td>
                <td
                  className={`px-3 py-2 text-right ${
                    row.pointsDiff >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {row.pointsDiff > 0 ? `+${row.pointsDiff}` : row.pointsDiff}
                </td>
                <td className="px-3 py-2">
                  <span className="flex gap-1">
                    {row.form.map((r, i) => (
                      <span
                        key={i}
                        title={r === "W" ? "Win" : "Loss"}
                        className={`inline-block h-2 w-2 rounded-full ${
                          r === "W" ? "bg-emerald-500" : "bg-red-500"
                        }`}
                      />
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 flex items-center gap-4 text-xs text-neutral-500">
        <span>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-emerald-500" />
          Playoffs (1–6)
        </span>
        <span>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-amber-500" />
          Play-In (7–10)
        </span>
        <span className="ml-auto">Form: last 5 games</span>
      </p>
    </div>
  );
}
