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
              <th className="px-3 py-2 text-right">PF</th>
              <th className="px-3 py-2 text-right">PA</th>
              <th className="px-3 py-2 text-right">+/−</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => (
              <tr
                key={row.club.code}
                className="border-t border-neutral-800/60 hover:bg-neutral-900/60"
              >
                <td className="px-3 py-2 text-neutral-400">{row.position}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-neutral-500">
        Top 6 qualify directly for the playoffs; 7–10 enter the play-in.
      </p>
    </div>
  );
}
