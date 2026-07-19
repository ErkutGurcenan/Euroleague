import Link from "next/link";
import type { Game, GameSide } from "@/lib/api";

function Side({ side, won }: { side: GameSide; won: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Link
        href={side.code ? `/teams/${side.code}` : "#"}
        className="flex min-w-0 items-center gap-2 hover:text-orange-400"
      >
        {side.crestUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={side.crestUrl} alt="" className="h-4 w-4 object-contain" />
        )}
        <span className="truncate text-sm">{side.name}</span>
      </Link>
      <span
        className={`text-sm tabular-nums ${
          won ? "font-bold text-white" : "text-neutral-400"
        }`}
      >
        {side.score ?? "–"}
      </span>
    </div>
  );
}

export default function GameCard({ game }: { game: Game }) {
  const date = game.utcDate
    ? new Date(game.utcDate).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      })
    : "TBD";
  const homeWon =
    game.played && (game.home.score ?? 0) > (game.away.score ?? 0);
  const awayWon =
    game.played && (game.away.score ?? 0) > (game.home.score ?? 0);

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
      <div className="mb-2 flex justify-between text-xs text-neutral-500">
        <span>{game.phaseType === "RS" ? game.roundName : game.groupName}</span>
        <span>{date} UTC</span>
      </div>
      <div className="space-y-1.5">
        <Side side={game.home} won={homeWon} />
        <Side side={game.away} won={awayWon} />
      </div>
    </div>
  );
}
