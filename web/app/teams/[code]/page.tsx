import Link from "next/link";
import { notFound } from "next/navigation";
import GameCard from "@/components/GameCard";
import ShotChartExplorer from "@/components/ShotChartExplorer";
import { getClub, getClubShots } from "@/lib/api";
import { currentSeason } from "@/lib/season";

function age(birthDate: string | null): string {
  if (!birthDate) return "–";
  const b = new Date(birthDate);
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
  return String(a);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  try {
    const { club } = await getClub(code.toUpperCase(), await currentSeason());
    return { title: club.name };
  } catch {
    return {};
  }
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const season = await currentSeason();
  let data, shotData;
  try {
    [data, shotData] = await Promise.all([
      getClub(code.toUpperCase(), season),
      getClubShots(code.toUpperCase(), season),
    ]);
  } catch {
    notFound();
  }
  const { club, stats, coaches, roster, games } = data;
  const headCoach = coaches.find((c) => c.role === "Head coach" && c.active);
  const assistants = coaches.filter(
    (c) => c.role === "Assistant coach" && c.active,
  );
  const activeRoster = roster.filter((p) => p.active);
  const results = games.filter((g) => g.played);
  const upcoming = games.filter((g) => !g.played);

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        {club.crestUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={club.crestUrl} alt="" className="h-16 w-16 object-contain" />
        )}
        <div>
          <h1 className="text-2xl font-bold">{club.name}</h1>
          <p className="text-sm text-neutral-400">
            {club.city ? `${club.city}, ` : ""}
            {club.country}
            {club.website && (
              <>
                {" · "}
                <a
                  href={club.website}
                  className="text-orange-400 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  website
                </a>
              </>
            )}
          </p>
          {headCoach && (
            <p className="mt-0.5 text-sm text-neutral-400">
              Head coach:{" "}
              <span className="text-neutral-200">{headCoach.name}</span>
              {assistants.length > 0 && (
                <span className="text-neutral-500">
                  {" "}
                  · Assistants:{" "}
                  {assistants.map((a) => a.name).join(", ")}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {stats && (
        <>
          <h2 className="mb-3 text-lg font-semibold">Season</h2>
          <div className="mb-8 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-10">
            {[
              ["Record", `${stats.wins}–${stats.losses}`],
              ["PTS", stats.points],
              ["Opp PTS", stats.opponentPoints ?? "–"],
              ["REB", stats.rebounds],
              ["AST", stats.assists],
              ["STL", stats.steals],
              ["TO", stats.turnovers],
              ["2P%", stats.fg2Pct ?? "–"],
              ["3P%", stats.fg3Pct ?? "–"],
              ["FT%", stats.ftPct ?? "–"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-2 py-3 text-center"
              >
                <div className="text-lg font-bold tabular-nums">{value}</div>
                <div className="text-xs uppercase text-neutral-500">{label}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {shotData.shots.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-semibold">Season shot chart</h2>
          <div className="mb-8">
            <ShotChartExplorer shots={shotData.shots} />
          </div>
        </>
      )}

      {stats && (
        <>
          <h2 className="mb-3 text-lg font-semibold">Quarter profile</h2>
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.quarters.map((q) => (
              <div
                key={q.quarter}
                className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-3 text-center"
              >
                <div className="text-xs uppercase text-neutral-500">
                  Q{q.quarter}
                </div>
                <div
                  className={`text-lg font-bold tabular-nums ${
                    (q.net ?? 0) > 0
                      ? "text-emerald-400"
                      : (q.net ?? 0) < 0
                        ? "text-red-400"
                        : ""
                  }`}
                >
                  {q.net !== null && q.net > 0 ? `+${q.net}` : (q.net ?? "–")}
                </div>
                <div className="text-xs tabular-nums text-neutral-400">
                  {q.for} – {q.against}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="mb-3 text-lg font-semibold">Roster</h2>
      <div className="mb-8 overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2">Position</th>
              <th className="px-3 py-2 text-right">Height</th>
              <th className="px-3 py-2 text-right">Age</th>
              <th className="px-2 py-2 text-right">GP</th>
              <th className="px-2 py-2 text-right">Min</th>
              <th className="px-2 py-2 text-right">Pts</th>
              <th className="px-2 py-2 text-right">Reb</th>
              <th className="px-2 py-2 text-right">Ast</th>
              <th className="px-2 py-2 text-right">PIR</th>
            </tr>
          </thead>
          <tbody>
            {activeRoster.map((p) => (
              <tr
                key={`${p.personCode}-${p.dorsal}`}
                className="border-t border-neutral-800/60"
              >
                <td className="px-3 py-2 tabular-nums text-neutral-400">
                  {p.dorsal ?? "–"}
                </td>
                <td className="px-3 py-2 font-medium">
                  <Link
                    href={`/players/${p.personCode}`}
                    className="hover:text-orange-400"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-neutral-400">
                  {p.positionName ?? "–"}
                </td>
                <td className="px-3 py-2 text-right text-neutral-400">
                  {p.heightCm ? `${p.heightCm} cm` : "–"}
                </td>
                <td className="px-3 py-2 text-right text-neutral-400">
                  {age(p.birthDate)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-neutral-400">
                  {p.gamesPlayed || "–"}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-neutral-400">
                  {p.minutes ?? "–"}
                </td>
                <td className="px-2 py-2 text-right font-medium tabular-nums">
                  {p.points ?? "–"}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {p.rebounds ?? "–"}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {p.assists ?? "–"}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {p.pir ?? "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {upcoming.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-semibold">Upcoming</h2>
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.slice(0, 6).map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </>
      )}

      <h2 className="mb-3 text-lg font-semibold">Results</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results
          .slice()
          .reverse()
          .map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
      </div>
    </div>
  );
}
