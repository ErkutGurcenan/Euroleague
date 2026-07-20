export const metadata = { title: "Compare players" };

import Link from "next/link";
import Headshot from "@/components/Headshot";
import PlayerPicker from "@/components/PlayerPicker";
import ShotChart from "@/components/ShotChart";
import ZoneChart from "@/components/ZoneChart";
import {
  getPlayer,
  getPlayerShots,
  type PlayerDetail,
  type ShotPoint,
} from "@/lib/api";

function StatRow({
  label,
  a,
  b,
  higherWins = true,
}: {
  label: string;
  a: number | null;
  b: number | null;
  higherWins?: boolean;
}) {
  const aWins =
    a !== null && b !== null && a !== b && (higherWins ? a > b : a < b);
  const bWins =
    a !== null && b !== null && a !== b && (higherWins ? b > a : b < a);
  return (
    <div className="flex items-center justify-between border-t border-neutral-800/60 px-4 py-2 text-sm">
      <span
        className={`w-16 text-left tabular-nums ${
          aWins ? "font-bold text-orange-400" : ""
        }`}
      >
        {a ?? "–"}
      </span>
      <span className="text-xs uppercase text-neutral-500">{label}</span>
      <span
        className={`w-16 text-right tabular-nums ${
          bWins ? "font-bold text-orange-400" : ""
        }`}
      >
        {b ?? "–"}
      </span>
    </div>
  );
}

function PlayerHeader({ player }: { player: PlayerDetail }) {
  return (
    <div className="mt-3 flex items-center gap-3">
      <Headshot src={player.imageUrl} name={player.name} size={48} />
      <div className="min-w-0">
        <Link
          href={`/players/${player.playerCode}`}
          className="font-semibold hover:text-orange-400"
        >
          {player.name}
        </Link>
        <p className="text-xs text-neutral-400">
          {player.club?.name}
          {player.positionName && ` · ${player.positionName}`}
        </p>
      </div>
    </div>
  );
}

function Charts({ shots }: { shots: ShotPoint[] }) {
  return (
    <div className="mt-4 space-y-4">
      <ShotChart shots={shots} />
      <ZoneChart shots={shots} />
    </div>
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const safe = <T,>(p: Promise<T>) => p.catch(() => null);
  const [pa, pb, sa, sb] = await Promise.all([
    a ? safe(getPlayer(a)) : null,
    b ? safe(getPlayer(b)) : null,
    a ? safe(getPlayerShots(a)) : null,
    b ? safe(getPlayerShots(b)) : null,
  ]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Compare players</h1>
        <span className="flex overflow-hidden rounded-md border border-neutral-700 text-xs">
          <span className="bg-neutral-800 px-2 py-1 text-white">Players</span>
          <Link
            href="/compare/teams"
            className="px-2 py-1 text-neutral-400 hover:text-white"
          >
            Teams
          </Link>
        </span>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <PlayerPicker slot="a" currentName={pa?.name ?? null} />
          {pa && <PlayerHeader player={pa} />}
        </div>
        <div>
          <PlayerPicker slot="b" currentName={pb?.name ?? null} />
          {pb && <PlayerHeader player={pb} />}
        </div>
      </div>

      {pa && pb ? (
        <>
          <div className="mb-8 rounded-lg border border-neutral-800 bg-neutral-900/40">
            <div className="flex items-center justify-between px-4 py-2 text-sm font-medium">
              <span>{pa.name}</span>
              <span>{pb.name}</span>
            </div>
            <StatRow label="Games" a={pa.averages.gamesPlayed} b={pb.averages.gamesPlayed} />
            <StatRow label="Minutes" a={pa.averages.minutes} b={pb.averages.minutes} />
            <StatRow label="Points" a={pa.averages.points} b={pb.averages.points} />
            <StatRow label="Rebounds" a={pa.averages.rebounds} b={pb.averages.rebounds} />
            <StatRow label="Assists" a={pa.averages.assists} b={pb.averages.assists} />
            <StatRow label="PIR" a={pa.averages.pir} b={pb.averages.pir} />
            <StatRow label="2P%" a={pa.averages.fg2Pct} b={pb.averages.fg2Pct} />
            <StatRow label="3P%" a={pa.averages.fg3Pct} b={pb.averages.fg3Pct} />
            <StatRow label="FT%" a={pa.averages.ftPct} b={pb.averages.ftPct} />
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Charts shots={sa?.shots ?? []} />
            <Charts shots={sb?.shots ?? []} />
          </div>
        </>
      ) : (
        <p className="text-neutral-400">
          Pick two players to compare their season.
        </p>
      )}
    </div>
  );
}
