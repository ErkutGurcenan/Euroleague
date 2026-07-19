import Link from "next/link";
import GameCard from "@/components/GameCard";
import { getGames, type Game } from "@/lib/api";

const PHASES: Record<string, string> = {
  PI: "Play-In",
  PO: "Playoffs",
  FF: "Final Four",
};

function SeriesSection({ title, games }: { title: string; games: Game[] }) {
  // series tally: wins per club across the group's games
  const wins = new Map<string, number>();
  for (const g of games) {
    if (!g.played) continue;
    const winner =
      (g.home.score ?? 0) > (g.away.score ?? 0) ? g.home.code : g.away.code;
    if (winner) wins.set(winner, (wins.get(winner) ?? 0) + 1);
  }
  const tally =
    games.length > 1
      ? [g0Side(games[0], "home"), g0Side(games[0], "away")]
          .map((code) => `${wins.get(code ?? "") ?? 0}`)
          .join("–")
      : null;

  return (
    <div className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        {title.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
        {tally && (
          <span className="ml-2 rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-300">
            Series {tally}
          </span>
        )}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
      </div>
    </div>
  );
}

function g0Side(g: Game, side: "home" | "away"): string | null {
  return g[side].code;
}

function FinalFourBracket({ games }: { games: Game[] }) {
  const semiA = games.find((g) => g.groupName?.toUpperCase().startsWith("SEMIFINAL A"));
  const semiB = games.find((g) => g.groupName?.toUpperCase().startsWith("SEMIFINAL B"));
  const final = games.find((g) =>
    g.groupName?.toUpperCase().includes("CHAMPIONSHIP"),
  );
  const label = (text: string) => (
    <h2 className="mb-2 text-center text-sm font-semibold uppercase tracking-wide text-neutral-400">
      {text}
    </h2>
  );
  return (
    <div className="grid items-center gap-4 lg:grid-cols-[1fr_auto_1.15fr_auto_1fr]">
      <div>
        {label("Semifinal")}
        {semiA && <GameCard game={semiA} />}
      </div>
      <div className="hidden text-2xl text-neutral-600 lg:block">⟶</div>
      <div className="rounded-xl border border-orange-600/40 p-1.5">
        {label("🏆 Championship")}
        {final && <GameCard game={final} />}
      </div>
      <div className="hidden text-2xl text-neutral-600 lg:block">⟵</div>
      <div>
        {label("Semifinal")}
        {semiB && <GameCard game={semiB} />}
      </div>
    </div>
  );
}

const MONTH_LABEL = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const DAY_LABEL = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string; phase?: string; month?: string }>;
}) {
  const params = await searchParams;
  const { games: allGames } = await getGames();

  const rsRounds = [
    ...new Set(
      allGames
        .filter((g) => g.phaseType === "RS" && g.round !== null)
        .map((g) => g.round as number),
    ),
  ].sort((a, b) => a - b);

  const months = [
    ...new Set(
      allGames.filter((g) => g.utcDate).map((g) => g.utcDate!.slice(0, 7)),
    ),
  ].sort();
  const month =
    params.month === "latest"
      ? months[months.length - 1]
      : params.month && months.includes(params.month)
        ? params.month
        : null;

  const phase =
    !month && params.phase && PHASES[params.phase] ? params.phase : null;
  const lastPlayedRound = Math.max(
    0,
    ...allGames
      .filter((g) => g.phaseType === "RS" && g.played && g.round !== null)
      .map((g) => g.round!),
  );
  const round =
    phase || month ? null : params.round ? Number(params.round) : lastPlayedRound;

  let content;
  if (month) {
    const monthGames = allGames.filter((g) => g.utcDate?.startsWith(month));
    const days = new Map<string, Game[]>();
    for (const g of monthGames) {
      const day = g.utcDate!.slice(0, 10);
      if (!days.has(day)) days.set(day, []);
      days.get(day)!.push(g);
    }
    content = [...days.entries()].map(([day, games]) => (
      <div key={day} className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          {DAY_LABEL.format(new Date(day))}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      </div>
    ));
  } else if (phase === "FF") {
    content = (
      <FinalFourBracket games={allGames.filter((g) => g.phaseType === "FF")} />
    );
  } else if (phase) {
    const phaseGames = allGames.filter((g) => g.phaseType === phase);
    const groups = new Map<string, Game[]>();
    for (const g of phaseGames) {
      const key = g.groupName ?? "Other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(g);
    }
    content = [...groups.entries()].map(([name, games]) => (
      <SeriesSection
        key={name}
        title={name.length <= 2 ? `Play-In ${name}` : name}
        games={games}
      />
    ));
  } else {
    const games = allGames.filter((g) => g.round === round);
    content = (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold">Games</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-400">
            {month
              ? MONTH_LABEL.format(new Date(`${month}-01`))
              : phase
                ? PHASES[phase]
                : `Regular season · Round ${round}`}
          </span>
          <span className="flex overflow-hidden rounded-md border border-neutral-700 text-xs">
            <Link
              href="/games"
              className={`px-2 py-1 ${
                !month ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              Rounds
            </Link>
            <Link
              href="/games?month=latest"
              className={`px-2 py-1 ${
                month ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              Calendar
            </Link>
          </span>
        </div>
      </div>

      {month ? (
        <div className="mb-5 flex flex-wrap items-center gap-1">
          {months.map((m) => (
            <Link
              key={m}
              href={`/games?month=${m}`}
              className={`rounded px-2 py-1 text-xs ${
                m === month
                  ? "bg-orange-600 text-white"
                  : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
              }`}
            >
              {MONTH_LABEL.format(new Date(`${m}-01`))}
            </Link>
          ))}
        </div>
      ) : (
      <div className="mb-5 flex flex-wrap items-center gap-1">
        {rsRounds.map((r) => (
          <Link
            key={r}
            href={`/games?round=${r}`}
            className={`rounded px-2 py-1 text-xs tabular-nums ${
              !phase && r === round
                ? "bg-orange-600 text-white"
                : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
            }`}
          >
            {r}
          </Link>
        ))}
        <span className="mx-1 h-4 w-px bg-neutral-700" />
        {Object.entries(PHASES).map(([code, label]) => (
          <Link
            key={code}
            href={`/games?phase=${code}`}
            className={`rounded px-2 py-1 text-xs font-medium ${
              phase === code
                ? "bg-orange-600 text-white"
                : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
      )}

      {content}
    </div>
  );
}
