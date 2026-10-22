import Link from "next/link";
import GameCard from "@/components/GameCard";
import Headshot from "@/components/Headshot";
import {
  getAwards,
  getGames,
  getHighs,
  getPlayers,
  getSeasons,
  getStandings,
  type Game,
  type PlayerSummary,
} from "@/lib/api";
import { currentSeason, seasonLabel } from "@/lib/season";

const AWARD_ICONS: Record<string, string> = {
  MVP: "🏅",
  "Final Four MVP": "🏆",
  "Rising Star": "✨",
  "Best Defender": "🛡️",
};

function LeaderRow({
  label,
  player,
  value,
}: {
  label: string;
  player: PlayerSummary;
  value: number;
}) {
  return (
    <li className="flex items-center gap-2 border-t border-neutral-800/40 py-1.5 text-sm first:border-t-0">
      <span className="w-9 text-xs uppercase text-neutral-500">{label}</span>
      <Headshot src={player.imageUrl} name={player.name} size={22} />
      <Link
        href={`/players/${player.playerCode}`}
        className="min-w-0 flex-1 truncate hover:text-orange-400"
      >
        {player.name}
      </Link>
      <span className="text-xs text-neutral-500">{player.club?.code}</span>
      <span className="w-10 text-right font-semibold tabular-nums">
        {value.toFixed(1)}
      </span>
    </li>
  );
}

export default async function HomePage() {
  const season = await currentSeason();
  const [standings, players, highs, games, awards, seasonList] =
    await Promise.all([
      getStandings(undefined, season),
      getPlayers(season),
      getHighs(season),
      getGames(season),
      getAwards(season),
      getSeasons().catch(() => null),
    ]);
  const label = seasonLabel(games.season);
  const seasonNote =
    seasonList?.seasons.find((s) => s.code === games.season)?.note ?? null;

  const ffGames = games.games.filter((g) => g.phaseType === "FF");
  const final = ffGames.find((g) =>
    g.groupName?.toUpperCase().includes("CHAMPIONSHIP"),
  );
  const champion =
    final &&
    ((final.home.score ?? 0) > (final.away.score ?? 0) ? final.home : final.away);
  const runnerUp =
    final && (champion === final.home ? final.away : final.home);

  const byDate = (a: Game, b: Game) =>
    (a.utcDate ?? "").localeCompare(b.utcDate ?? "");
  const sameSlot = (a: Game, b: Game) =>
    a.phaseType === b.phaseType && a.round === b.round && a.groupName === b.groupName;
  const playedGames = games.games.filter((g) => g.played).sort(byDate);
  const upcoming = games.games.filter((g) => !g.played).sort(byDate);
  const lastPlayed = playedGames.at(-1);
  const nextGame = upcoming[0];
  const inProgress = !champion && !seasonNote && !!nextGame;
  const latestGames = lastPlayed
    ? playedGames.filter((g) => sameSlot(g, lastPlayed))
    : [];
  const slotRemaining = lastPlayed
    ? upcoming.filter((g) => sameSlot(g, lastPlayed)).length
    : 0;
  const rsRounds = games.games
    .filter((g) => g.phaseType === "RS" && g.round !== null)
    .map((g) => g.round as number);
  const totalRounds = rsRounds.length ? Math.max(...rsRounds) : null;
  const slotName = (g: Game) =>
    g.phaseType === "RS" ? g.roundName : g.groupName ?? g.roundName;
  const nextDate = nextGame?.utcDate
    ? new Date(nextGame.utcDate).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      })
    : null;

  const by = (key: keyof PlayerSummary) =>
    [...players.players].sort(
      (a, b) => (b[key] as number) - (a[key] as number),
    )[0];
  const leaders: [string, keyof PlayerSummary][] = [
    ["PTS", "points"],
    ["REB", "rebounds"],
    ["AST", "assists"],
    ["STL", "steals"],
    ["BLK", "blocks"],
    ["PIR", "pir"],
  ];

  const highGroups = (
    [
      ["points", "pts"],
      ["rebounds", "reb"],
      ["assists", "ast"],
    ] as const
  ).map(([key, unit]) => ({
    key,
    unit,
    entries:
      highs.categories.find((c) => c.key === key)?.entries.slice(0, 2) ?? [],
  }));

  return (
    <div>
      {/* canceled-season banner (shown when there is no champion) */}
      {!champion && seasonNote && (
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-neutral-700 bg-neutral-900/60 p-4">
          <span className="text-3xl" aria-hidden="true">
            ⚠
          </span>
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-400">
              {label} EuroLeague
            </div>
            <div className="text-lg font-bold">{seasonNote}</div>
          </div>
        </div>
      )}

      {/* season-in-progress hero */}
      {inProgress && (
        <Link
          href={
            lastPlayed?.phaseType === "RS" && lastPlayed.round
              ? `/games?round=${lastPlayed.round}`
              : "/games"
          }
          className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-xl border border-orange-600/40 bg-neutral-900/60 p-4 transition-colors hover:border-orange-500"
        >
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-orange-400">
              {label} EuroLeague · season in progress
            </div>
            <div className="text-xl font-bold">
              {!lastPlayed
                ? "Tip-off is coming"
                : slotRemaining > 0
                  ? `${slotName(lastPlayed)} under way`
                  : lastPlayed.phaseType === "RS" && totalRounds
                    ? `${lastPlayed.roundName} of ${totalRounds} complete`
                    : `${slotName(lastPlayed)} complete`}
            </div>
            {slotRemaining > 0 && (
              <div className="text-sm text-neutral-400">
                {latestGames.length} of {latestGames.length + slotRemaining}{" "}
                games played
              </div>
            )}
          </div>
          {nextGame && (
            <div className="text-sm text-neutral-400">
              {slotRemaining > 0
                ? `Next game: ${nextGame.home.name} vs ${nextGame.away.name}`
                : `Next up: ${slotName(nextGame)}`}
              {nextDate && ` · ${slotRemaining > 0 ? "" : "starts "}${nextDate}`} →
            </div>
          )}
        </Link>
      )}

      {/* champion hero */}
      {final && champion && (
        <Link
          href={`/games/${final.gameCode}`}
          className="mb-6 flex items-center gap-4 rounded-xl border border-orange-600/40 bg-neutral-900/60 p-4 transition-colors hover:border-orange-500"
        >
          {champion.crestUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={champion.crestUrl}
              alt=""
              className="h-14 w-14 object-contain"
            />
          )}
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-orange-400">
              🏆 {label} EuroLeague champions
            </div>
            <div className="truncate text-xl font-bold">{champion.name}</div>
            <div className="text-sm text-neutral-400">
              Beat {runnerUp?.name} {champion.score}–{runnerUp?.score} in the
              final · view game
            </div>
          </div>
        </Link>
      )}

      {/* awards shelf */}
      {awards.awards.length > 0 && (
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {awards.awards.map((a) => (
          <Link
            key={a.award}
            href={`/players/${a.playerCode}`}
            className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3 transition-colors hover:border-orange-600/50"
          >
            <div className="text-xs text-neutral-500">
              {AWARD_ICONS[a.award] ?? "🏅"} {a.award}
            </div>
            <div className="mt-0.5 truncate text-sm font-semibold">{a.name}</div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              {a.crestUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.crestUrl} alt="" className="h-3.5 w-3.5 object-contain" />
              )}
              {a.clubName}
            </div>
          </Link>
        ))}
      </div>
      )}

      {/* standings + leaders */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-300">
              Standings
            </h2>
            <Link
              href="/standings"
              className="text-xs text-orange-400 hover:underline"
            >
              Full table →
            </Link>
          </div>
          <ol>
            {standings.standings.slice(0, 6).map((r) => (
              <li
                key={r.club.code}
                className="flex items-center gap-2 border-t border-neutral-800/40 py-1.5 text-sm first:border-t-0"
              >
                <span className="w-5 text-right tabular-nums text-neutral-500">
                  {r.position}
                </span>
                {r.club.crestUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.club.crestUrl}
                    alt=""
                    className="h-4 w-4 object-contain"
                  />
                )}
                <Link
                  href={`/teams/${r.club.code}`}
                  className="min-w-0 flex-1 truncate hover:text-orange-400"
                >
                  {r.club.name}
                </Link>
                <span className="tabular-nums text-neutral-400">
                  {r.gamesWon}–{r.gamesLost}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-300">
              League leaders
            </h2>
            <Link
              href="/players"
              className="text-xs text-orange-400 hover:underline"
            >
              All players →
            </Link>
          </div>
          <ol>
            {leaders.map(([label, key]) => {
              const p = by(key);
              return (
                p && (
                  <LeaderRow
                    key={label}
                    label={label}
                    player={p}
                    value={p[key] as number}
                  />
                )
              );
            })}
          </ol>
        </div>
      </div>

      {/* highs teaser + final four */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-300">
              Season highs
            </h2>
            <Link href="/highs" className="text-xs text-orange-400 hover:underline">
              All highs →
            </Link>
          </div>
          {highGroups.map((group) => (
            <div key={group.key} className="mb-2 last:mb-0">
              <div className="mt-2 text-xs uppercase text-neutral-500 first:mt-0">
                {group.key}
              </div>
              <ol>
                {group.entries.map((e) => (
                  <li
                    key={`${e.playerCode}-${e.gameCode}`}
                    className="flex items-center gap-2 border-t border-neutral-800/40 py-1.5 text-sm first:border-t-0"
                  >
                    <Link
                      href={`/players/${e.playerCode}`}
                      className="min-w-0 flex-1 truncate hover:text-orange-400"
                    >
                      {e.name}
                    </Link>
                    <Link
                      href={`/games/${e.gameCode}`}
                      className="text-xs text-neutral-500 hover:text-orange-400"
                    >
                      vs {e.opponent}
                    </Link>
                    <span className="font-bold tabular-nums">
                      {e.value} {group.unit}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        {ffGames.length > 0 ? (
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-300">
                Final Four
              </h2>
              <Link
                href="/games?phase=FF"
                className="text-xs text-orange-400 hover:underline"
              >
                Bracket →
              </Link>
            </div>
            <div className="grid gap-3">
              {ffGames.map((g) => (
                <GameCard key={g.id} game={g} />
              ))}
            </div>
          </div>
        ) : (
          lastPlayed && (
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-300">
                  {slotName(lastPlayed)} results
                </h2>
                <Link
                  href={
                    lastPlayed.phaseType === "RS" && lastPlayed.round
                      ? `/games?round=${lastPlayed.round}`
                      : "/games"
                  }
                  className="text-xs text-orange-400 hover:underline"
                >
                  All games →
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {latestGames.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
