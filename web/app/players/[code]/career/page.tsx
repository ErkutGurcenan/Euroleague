import Link from "next/link";
import { notFound } from "next/navigation";
import Headshot from "@/components/Headshot";
import PlayerViewToggle from "@/components/PlayerViewToggle";
import { getPlayerCareer, type CareerSeason } from "@/lib/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  try {
    const c = await getPlayerCareer(code);
    return { title: `${c.name} — career` };
  } catch {
    return {};
  }
}

const AWARD_ICON: Record<string, string> = {
  MVP: "🏅",
  "Final Four MVP": "🏆",
  "Rising Star": "✨",
  "Best Defender": "🛡️",
};

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-3 text-center">
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-xs uppercase text-neutral-500">{label}</div>
    </div>
  );
}

function Cell({ v }: { v: number | string | null }) {
  return (
    <td className="px-2 py-2 text-right tabular-nums">{v ?? "–"}</td>
  );
}

export default async function CareerPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  let c;
  try {
    c = await getPlayerCareer(code);
  } catch {
    notFound();
  }

  // insert gap markers for seasons the player missed between first and last
  const played = c.seasons.map((s) => Number(s.season.slice(1)));
  const firstYear = Math.min(...played);
  const lastYear = Math.max(...played);
  const bySeason = new Map(c.seasons.map((s) => [Number(s.season.slice(1)), s]));
  const rows: (CareerSeason | { gapYear: number })[] = [];
  for (let y = firstYear; y <= lastYear; y++) {
    const s = bySeason.get(y);
    rows.push(s ?? { gapYear: y });
  }

  const career = c.career;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Headshot src={c.imageUrl} name={c.name} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{c.name}</h1>
          <p className="text-sm text-neutral-400">
            {c.positionName && `${c.positionName} · `}
            {c.seasonsPlayed} EuroLeague season{c.seasonsPlayed === 1 ? "" : "s"}
          </p>
        </div>
        <PlayerViewToggle code={code} active="career" />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Games" value={career.gamesPlayed} />
        <Tile label="Career PPG" value={career.points ?? "–"} />
        <Tile label="Career RPG" value={career.rebounds ?? "–"} />
        <Tile label="Career PIR" value={career.pir ?? "–"} />
      </div>

      {c.awards.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {c.awards.map((a, i) => (
            <span
              key={i}
              className="rounded-md border border-orange-600/40 bg-orange-950/40 px-2.5 py-1 text-xs text-orange-300"
            >
              {AWARD_ICON[a.award] ?? "🏅"} {a.seasonLabel} {a.award}
            </span>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-3 py-2">Season</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-2 py-2 text-right">GP</th>
              <th className="px-2 py-2 text-right">Min</th>
              <th className="px-2 py-2 text-right">Pts</th>
              <th className="px-2 py-2 text-right">Reb</th>
              <th className="px-2 py-2 text-right">Ast</th>
              <th className="px-2 py-2 text-right">2P%</th>
              <th className="px-2 py-2 text-right">3P%</th>
              <th className="px-2 py-2 text-right">PIR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              if ("gapYear" in r) {
                return (
                  <tr key={`gap${r.gapYear}`} className="border-t border-neutral-800/60">
                    <td className="px-3 py-1.5 text-neutral-600">
                      {r.gapYear}-{String(r.gapYear + 1).slice(-2)}
                    </td>
                    <td
                      colSpan={9}
                      className="px-3 py-1.5 text-xs italic text-neutral-600"
                    >
                      did not play in the EuroLeague
                    </td>
                  </tr>
                );
              }
              const won = c.awards.some((a) => a.season === r.season && a.award === "MVP");
              return (
                <tr
                  key={r.season}
                  className={`border-t border-neutral-800/60 ${
                    won ? "bg-orange-950/20" : ""
                  }`}
                >
                  <td className="px-3 py-2">
                    {r.seasonLabel}
                    {won && <span className="ml-1" title="MVP">🏅</span>}
                  </td>
                  <td className="px-3 py-2">
                    {r.clubCode ? (
                      <Link
                        href={`/teams/${r.clubCode}`}
                        className="flex items-center gap-1.5 text-neutral-300 hover:text-orange-400"
                      >
                        {r.crestUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.crestUrl}
                            alt=""
                            className="h-4 w-4 object-contain"
                          />
                        )}
                        {r.clubName}
                      </Link>
                    ) : (
                      "–"
                    )}
                  </td>
                  <Cell v={r.gamesPlayed} />
                  <Cell v={r.minutes} />
                  <Cell v={r.points} />
                  <Cell v={r.rebounds} />
                  <Cell v={r.assists} />
                  <Cell v={r.fg2Pct} />
                  <Cell v={r.fg3Pct} />
                  <Cell v={r.pir} />
                </tr>
              );
            })}
            <tr className="border-t border-neutral-700 bg-neutral-900/60 font-medium">
              <td className="px-3 py-2" colSpan={2}>
                Career
              </td>
              <Cell v={career.gamesPlayed} />
              <Cell v={career.minutes} />
              <Cell v={career.points} />
              <Cell v={career.rebounds} />
              <Cell v={career.assists} />
              <Cell v={career.fg2Pct} />
              <Cell v={career.fg3Pct} />
              <Cell v={career.pir} />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Averages are per game. Career percentages are weighted by attempts.
      </p>
    </div>
  );
}
