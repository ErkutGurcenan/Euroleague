import Link from "next/link";
import { notFound } from "next/navigation";
import GameCard from "@/components/GameCard";
import ShotChart from "@/components/ShotChart";
import { getGame, type GameDetail, type GameDetailSide } from "@/lib/api";
import { currentSeason } from "@/lib/season";

function seriesTally(game: GameDetail): string | null {
  const codeA = game.home.club?.code;
  const codeB = game.away.club?.code;
  if (!codeA || !codeB) return null;
  const wins: Record<string, number> = { [codeA]: 0, [codeB]: 0 };
  const all = [
    ...game.headToHead,
    {
      played: game.played,
      home: { code: codeA, score: game.home.score },
      away: { code: codeB, score: game.away.score },
    },
  ];
  for (const g of all) {
    if (!g.played || g.home.score == null || g.away.score == null) continue;
    const winner = g.home.score > g.away.score ? g.home.code : g.away.code;
    if (winner && winner in wins) wins[winner] += 1;
  }
  if (wins[codeA] === wins[codeB]) return `Season series tied ${wins[codeA]}–${wins[codeB]}`;
  const leader = wins[codeA] > wins[codeB] ? codeA : codeB;
  const club = leader === codeA ? game.home.club : game.away.club;
  return `${club?.abbreviatedName ?? leader} leads season series ${Math.max(
    wins[codeA], wins[codeB],
  )}–${Math.min(wins[codeA], wins[codeB])}`;
}

function BoxScoreTable({ side }: { side: GameDetailSide }) {
  const t = side.totals;
  return (
    <div className="mb-8">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        {side.club?.crestUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={side.club.crestUrl} alt="" className="h-6 w-6 object-contain" />
        )}
        {side.club?.name}
      </h2>
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-3 py-2">Player</th>
              <th className="px-2 py-2 text-right">Min</th>
              <th className="px-2 py-2 text-right">Pts</th>
              <th className="px-2 py-2 text-right">2P</th>
              <th className="px-2 py-2 text-right">3P</th>
              <th className="px-2 py-2 text-right">FT</th>
              <th className="px-2 py-2 text-right">Reb</th>
              <th className="px-2 py-2 text-right">Ast</th>
              <th className="px-2 py-2 text-right">Stl</th>
              <th className="px-2 py-2 text-right">To</th>
              <th className="px-2 py-2 text-right">Blk</th>
              <th className="px-2 py-2 text-right">PIR</th>
              <th className="px-2 py-2 text-right">+/−</th>
            </tr>
          </thead>
          <tbody>
            {side.players.map((p) => (
              <tr key={p.playerCode} className="border-t border-neutral-800/60">
                <td className="px-3 py-2">
                  <Link
                    href={`/players/${p.playerCode}`}
                    className="hover:text-orange-400"
                  >
                    <span className="mr-1.5 inline-block w-5 text-right tabular-nums text-neutral-500">
                      {p.dorsal}
                    </span>
                    <span className={p.isStarter ? "font-medium" : ""}>
                      {p.name}
                    </span>
                  </Link>
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {p.minutes}
                </td>
                <td className="px-2 py-2 text-right font-medium tabular-nums">
                  {p.points}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {p.fg2}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {p.fg3}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {p.ft}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{p.rebounds}</td>
                <td className="px-2 py-2 text-right tabular-nums">{p.assists}</td>
                <td className="px-2 py-2 text-right tabular-nums">{p.steals}</td>
                <td className="px-2 py-2 text-right tabular-nums">{p.turnovers}</td>
                <td className="px-2 py-2 text-right tabular-nums">{p.blocks}</td>
                <td className="px-2 py-2 text-right tabular-nums">{p.pir}</td>
                <td
                  className={`px-2 py-2 text-right tabular-nums ${
                    (p.plusMinus ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {p.plusMinus ?? "–"}
                </td>
              </tr>
            ))}
            <tr className="border-t border-neutral-700 bg-neutral-900/60 font-medium">
              <td className="px-3 py-2">Total</td>
              <td className="px-2 py-2" />
              <td className="px-2 py-2 text-right tabular-nums">{t.points}</td>
              <td className="px-2 py-2 text-right tabular-nums">
                {t.fg2m}/{t.fg2a}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {t.fg3m}/{t.fg3a}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {t.ftm}/{t.fta}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">{t.rebounds}</td>
              <td className="px-2 py-2 text-right tabular-nums">{t.assists}</td>
              <td className="px-2 py-2 text-right tabular-nums">{t.steals}</td>
              <td className="px-2 py-2 text-right tabular-nums">{t.turnovers}</td>
              <td className="px-2 py-2 text-right tabular-nums">{t.blocks}</td>
              <td className="px-2 py-2 text-right tabular-nums">{t.pir}</td>
              <td className="px-2 py-2" />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeamStatBar({
  label,
  home,
  away,
}: {
  label: string;
  home: string | number;
  away: string | number;
}) {
  return (
    <div className="flex items-center justify-between border-t border-neutral-800/60 px-4 py-2 text-sm">
      <span className="w-20 text-left tabular-nums">{home}</span>
      <span className="text-xs uppercase text-white">{label}</span>
      <span className="w-20 text-right tabular-nums">{away}</span>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gameCode: string }>;
}) {
  const { gameCode } = await params;
  try {
    const g = await getGame(Number(gameCode), await currentSeason());
    const h = g.home.club?.abbreviatedName ?? g.home.club?.code;
    const a = g.away.club?.abbreviatedName ?? g.away.club?.code;
    return {
      title: g.played ? `${h} ${g.home.score}–${g.away.score} ${a}` : `${h} vs ${a}`,
    };
  } catch {
    return {};
  }
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameCode: string }>;
}) {
  const { gameCode } = await params;
  let game;
  try {
    game = await getGame(Number(gameCode), await currentSeason());
  } catch {
    notFound();
  }
  const { home, away } = game;
  const date = game.utcDate
    ? new Date(game.utcDate).toLocaleString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      })
    : "TBD";
  const ht = home.totals;
  const at = away.totals;

  return (
    <div>
      <p className="mb-4 text-sm text-neutral-400">
        {game.phaseType === "RS" ? game.roundName : game.groupName} · {date} UTC
      </p>

      {/* scoreboard */}
      <div className="mb-8 rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
        <div className="flex items-center justify-between gap-4">
          {[home, away].map((side, i) => (
            <div
              key={i}
              className={`flex flex-1 items-center gap-3 ${
                i === 1 ? "flex-row-reverse text-right" : ""
              }`}
            >
              {side.club?.crestUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={side.club.crestUrl}
                  alt=""
                  className="h-12 w-12 object-contain"
                />
              )}
              <Link
                href={`/teams/${side.club?.code}`}
                className="font-semibold hover:text-orange-400"
              >
                {side.club?.name}
              </Link>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-center gap-6 text-4xl font-bold tabular-nums">
          <span
            className={
              (home.score ?? 0) > (away.score ?? 0) ? "" : "text-neutral-300"
            }
          >
            {home.score ?? "–"}
          </span>
          <span className="text-lg text-neutral-500">:</span>
          <span
            className={
              (away.score ?? 0) > (home.score ?? 0) ? "" : "text-neutral-300"
            }
          >
            {away.score ?? "–"}
          </span>
        </div>
        {game.played && (
          <table className="mx-auto mt-3 text-sm tabular-nums text-neutral-200">
            <thead>
              <tr className="text-xs uppercase text-neutral-600">
                <th className="px-3 text-left" />
                {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                  <th key={q} className="px-3 font-normal">
                    {q}
                  </th>
                ))}
                {(home.overtime || away.overtime) && <th className="px-3">OT</th>}
              </tr>
            </thead>
            <tbody>
              {[home, away].map((side, i) => (
                <tr key={i}>
                  <td className="px-3 text-left text-neutral-500">
                    {side.club?.abbreviatedName}
                  </td>
                  {side.quarters.map((q, j) => (
                    <td key={j} className="px-3 text-center">
                      {q ?? "–"}
                    </td>
                  ))}
                  {(home.overtime || away.overtime) && (
                    <td className="px-3 text-center">{side.overtime ?? 0}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {game.played && (
        <>
          {/* team comparison */}
          <h2 className="mb-3 text-lg font-semibold">Team stats</h2>
          <div className="mb-8 rounded-lg border border-neutral-800 bg-neutral-900/40">
            <div className="flex items-center justify-between px-4 py-2 text-sm font-medium">
              <span>{home.club?.abbreviatedName}</span>
              <span>{away.club?.abbreviatedName}</span>
            </div>
            <TeamStatBar
              label="2P"
              home={`${ht.fg2m}/${ht.fg2a} (${ht.fg2Pct ?? 0}%)`}
              away={`${at.fg2m}/${at.fg2a} (${at.fg2Pct ?? 0}%)`}
            />
            <TeamStatBar
              label="3P"
              home={`${ht.fg3m}/${ht.fg3a} (${ht.fg3Pct ?? 0}%)`}
              away={`${at.fg3m}/${at.fg3a} (${at.fg3Pct ?? 0}%)`}
            />
            <TeamStatBar
              label="FT"
              home={`${ht.ftm}/${ht.fta} (${ht.ftPct ?? 0}%)`}
              away={`${at.ftm}/${at.fta} (${at.ftPct ?? 0}%)`}
            />
            <TeamStatBar
              label="Rebounds (O+D)"
              home={`${ht.rebounds} (${ht.oreb}+${ht.dreb})`}
              away={`${at.rebounds} (${at.oreb}+${at.dreb})`}
            />
            <TeamStatBar label="Assists" home={ht.assists} away={at.assists} />
            <TeamStatBar label="Steals" home={ht.steals} away={at.steals} />
            <TeamStatBar
              label="Turnovers"
              home={ht.turnovers}
              away={at.turnovers}
            />
            <TeamStatBar label="Blocks" home={ht.blocks} away={at.blocks} />
            <TeamStatBar label="Fouls" home={ht.fouls} away={at.fouls} />
          </div>

          <BoxScoreTable side={home} />
          <BoxScoreTable side={away} />

          {(home.shots.length > 0 || away.shots.length > 0) && (
            <>
              <h2 className="mb-3 text-lg font-semibold">Shot charts</h2>
              <div className="mb-8 grid gap-8 lg:grid-cols-2">
                {[home, away].map(
                  (side, i) =>
                    side.shots.length > 0 && (
                      <div key={i}>
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase text-neutral-400">
                          {side.club?.crestUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={side.club.crestUrl}
                              alt=""
                              className="h-5 w-5 object-contain"
                            />
                          )}
                          {side.club?.name}
                        </h3>
                        <ShotChart shots={side.shots} />
                      </div>
                    ),
                )}
              </div>
            </>
          )}
        </>
      )}

      {game.headToHead.length > 0 && (
        <>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Head-to-head</h2>
            <span className="text-sm text-neutral-400">{seriesTally(game)}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {game.headToHead.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
