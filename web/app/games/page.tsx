import Link from "next/link";
import GameCard from "@/components/GameCard";
import { getGames } from "@/lib/api";

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  const params = await searchParams;
  const { games: allGames } = await getGames();

  const rounds = [...new Set(allGames.map((g) => g.round))].filter(
    (r): r is number => r !== null,
  );
  const lastPlayedRound = Math.max(
    0,
    ...allGames.filter((g) => g.played && g.round !== null).map((g) => g.round!),
  );
  const round = params.round ? Number(params.round) : lastPlayedRound;
  const games = allGames.filter((g) => g.round === round);

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Games</h1>
        <span className="text-sm text-neutral-400">
          {games[0]?.phaseType === "RS"
            ? `Round ${round} of ${rounds.length}`
            : games[0]?.groupName ?? `Round ${round}`}
        </span>
      </div>

      <div className="mb-5 flex flex-wrap gap-1">
        {rounds.map((r) => (
          <Link
            key={r}
            href={`/games?round=${r}`}
            className={`rounded px-2 py-1 text-xs tabular-nums ${
              r === round
                ? "bg-orange-600 text-white"
                : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
            }`}
          >
            {r}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
      </div>
      {games.length === 0 && (
        <p className="text-neutral-400">No games in this round.</p>
      )}
    </div>
  );
}
