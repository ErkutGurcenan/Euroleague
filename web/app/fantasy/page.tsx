export const metadata = { title: "Fantasy" };

import Link from "next/link";
import Headshot from "@/components/Headshot";
import { StatusPill } from "@/components/InjuryStatus";
import PlayersToggle from "@/components/PlayersToggle";
import TeamFilterSelect from "@/components/TeamFilterSelect";
import { getFantasy, type FantasyPlayer, type FantasyWatchList } from "@/lib/api";
import { currentSeason } from "@/lib/season";

const POSITIONS = ["Guard", "Forward", "Center"];

const delta = (p: FantasyPlayer) => (p.prevPir === null ? null : p.pir - p.prevPir);

// sort key -> [header label, value, higher is better]
const SORTS: Record<string, [string, (p: FantasyPlayer) => number | null, boolean]> = {
  pir: ["PIR", (p) => p.pir, true],
  floor: ["Range", (p) => p.floor, true],
  cv: ["Var.", (p) => p.cv, false],
  ppm: ["PIR/min", (p) => p.pirPerMin, true],
  last3: ["Last 3", (p) => p.last3, true],
  delta: ["vs LY", delta, true],
  min: ["MIN", (p) => p.minutes, true],
};

const signed = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}`;

function RangeBar({ p, scale }: { p: FantasyPlayer; scale: number }) {
  const pct = (v: number) => `${(Math.max(0, Math.min(v, scale)) / scale) * 100}%`;
  return (
    <div
      className="relative h-3 w-28"
      title={`Typical range ${p.floor}–${p.ceiling} (avg ± 1 sd) · best ${p.best}, worst ${p.worst}`}
    >
      <div className="absolute inset-x-0 top-1/2 h-px bg-neutral-800" />
      <div
        className="absolute top-0.5 h-2 rounded-sm bg-orange-600/35"
        style={{
          left: pct(p.floor),
          width: `calc(${pct(p.ceiling)} - ${pct(p.floor)})`,
        }}
      />
      <div
        className="absolute top-0 h-3 w-0.5 bg-orange-400"
        style={{ left: pct(p.pir) }}
      />
    </div>
  );
}

function LeaderTile({
  label,
  player,
  value,
  sub,
}: {
  label: string;
  player: FantasyPlayer | undefined;
  value: string;
  sub: string;
}) {
  if (!player) return null;
  return (
    <Link
      href={`/players/${player.playerCode}`}
      className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-3 transition-colors hover:border-orange-600/50"
    >
      <Headshot src={player.imageUrl} name={player.name} size={40} />
      <div className="min-w-0">
        <div className="text-xs uppercase text-neutral-500">{label}</div>
        <div className="truncate font-semibold">{player.name}</div>
        <div className="text-sm text-neutral-400">
          <span className="font-semibold text-white">{value}</span> · {sub}
        </div>
      </div>
    </Link>
  );
}

function watchValue(key: FantasyWatchList["key"], p: FantasyPlayer): string {
  switch (key) {
    case "form":
      return `${p.last3} last 3 (${signed(p.form ?? 0)})`;
    case "pirUp":
      return `${p.pir} from ${p.prevPir}`;
    case "role":
      return `${p.minutes} min from ${p.prevMinutes}${p.newClub ? " · new club" : ""}`;
    case "young":
      return `${p.pir} PIR · age ${p.age}`;
  }
}

export default async function FantasyPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; team?: string; pos?: string }>;
}) {
  const params = await searchParams;
  const sortKey = params.sort && SORTS[params.sort] ? params.sort : "pir";
  const team = params.team ?? null;
  const pos = params.pos && POSITIONS.includes(params.pos) ? params.pos : null;
  const { players, minGames, watch } = await getFantasy(await currentSeason());
  const byCode = new Map(players.map((p) => [p.playerCode, p]));

  const teams = [
    ...new Map(players.map((p) => [p.clubCode, { code: p.clubCode, name: p.clubName ?? p.clubCode }])).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));
  const [, value, higherBetter] = SORTS[sortKey];
  const rows = players
    .filter((p) => (!team || p.clubCode === team) && (!pos || p.position === pos))
    .sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      if (va === null) return 1;
      if (vb === null) return -1;
      return higherBetter ? vb - va : va - vb;
    });
  const scale = Math.max(30, ...players.slice(0, 50).map((p) => p.ceiling));

  const steadyMinGames = Math.max(3, minGames);
  const topPir = players[0];
  const steadiest = players
    .filter((p) => p.cv !== null && p.pir >= 10 && p.gamesPlayed >= steadyMinGames)
    .sort((a, b) => (a.cv ?? 0) - (b.cv ?? 0))[0];
  const efficient = players
    .filter((p) => p.pirPerMin !== null && p.minutes >= 15)
    .sort((a, b) => (b.pirPerMin ?? 0) - (a.pirPerMin ?? 0))[0];

  const filterQs = (overrides: Record<string, string | null>) => {
    const q = new URLSearchParams();
    const merged = { sort: params.sort ?? null, team, pos, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `/fantasy?${s}` : "/fantasy";
  };
  const chip = (active: boolean) =>
    `rounded px-2.5 py-1 text-xs ${
      active ? "bg-orange-600 text-white" : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
    }`;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
          <h1 className="text-2xl font-bold">Players</h1>
          <PlayersToggle active="fantasy" />
        </div>
        <span className="hidden text-sm text-neutral-400 sm:inline">
          EuroLeague Fantasy scores on PIR · min. {minGames} game{minGames === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <LeaderTile label="Top scorer" player={topPir} value={`${topPir?.pir} PIR`} sub="per game" />
        <LeaderTile
          label="Most consistent"
          player={steadiest}
          value={`±${steadiest?.sd}`}
          sub={`around ${steadiest?.pir} PIR`}
        />
        <LeaderTile
          label="Most efficient"
          player={efficient}
          value={efficient?.pirPerMin?.toFixed(2) ?? "–"}
          sub="PIR per minute (15+ min)"
        />
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-300">
        Watch list
      </h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {watch.map((w) => (
          <div key={w.key} className="rounded-lg border border-neutral-800 bg-neutral-900/40">
            <div className="border-b border-neutral-800 px-3 py-2">
              <div className="text-sm font-semibold">{w.label}</div>
              <div className="text-xs text-neutral-500">{w.sub}</div>
            </div>
            {w.players.length === 0 ? (
              <p className="px-3 py-3 text-xs text-neutral-500">Nobody yet</p>
            ) : (
              <ol>
                {w.players.map((code) => {
                  const p = byCode.get(code);
                  if (!p) return null;
                  return (
                    <li key={code} className="border-t border-neutral-800/40 first:border-t-0">
                      <Link
                        href={`/players/${code}`}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-900/60"
                      >
                        <Headshot src={p.imageUrl} name={p.name} size={24} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm">{p.name}</div>
                          <div className="truncate text-xs text-neutral-500">
                            {watchValue(w.key, p)}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Link href={filterQs({ pos: null })} className={chip(!pos)}>
          All positions
        </Link>
        {POSITIONS.map((p) => (
          <Link key={p} href={filterQs({ pos: p })} className={chip(pos === p)}>
            {p}s
          </Link>
        ))}
        <span className="mx-1 h-4 w-px bg-neutral-700" />
        <TeamFilterSelect teams={teams} current={team} basePath="/fantasy" />
        <span className="ml-auto text-xs text-neutral-500">{rows.length} players</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-2 py-2 text-right">GP</th>
              {(["min", "pir", "floor", "cv", "ppm", "last3", "delta"] as const).map((k) => (
                <th key={k} className={`px-2 py-2 ${k === "floor" ? "text-left" : "text-right"}`}>
                  <Link
                    href={filterQs({ sort: k })}
                    className={k === sortKey ? "text-orange-400" : "hover:text-white"}
                  >
                    {SORTS[k][0]}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 100).map((p, i) => {
              const d = delta(p);
              return (
                <tr key={p.playerCode} className="border-t border-neutral-800/60 hover:bg-neutral-900/60">
                  <td className="px-3 py-2 text-neutral-500">{i + 1}</td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <Link
                        href={`/players/${p.playerCode}`}
                        className="flex items-center gap-2 font-medium hover:text-orange-400"
                      >
                        <Headshot src={p.imageUrl} name={p.name} size={24} />
                        {p.name}
                      </Link>
                      {p.injury && (
                        <span title={p.injury.note}>
                          <StatusPill status={p.injury.status} />
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/teams/${p.clubCode}`}
                      className="flex items-center gap-1.5 text-neutral-400 hover:text-white"
                    >
                      {p.clubCrest && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.clubCrest} alt="" className="h-4 w-4 object-contain" />
                      )}
                      {p.clubCode}
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-right text-neutral-400">{p.gamesPlayed}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-neutral-300">
                    {p.minutes.toFixed(1)}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums">{p.pir.toFixed(1)}</td>
                  <td className="px-2 py-2">
                    <span className="flex items-center gap-2">
                      <RangeBar p={p} scale={scale} />
                      <span className="text-xs tabular-nums text-neutral-500">
                        {Math.max(0, p.floor).toFixed(0)}–{p.ceiling.toFixed(0)}
                      </span>
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-neutral-400">
                    {p.cv?.toFixed(2) ?? "–"}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-neutral-300">
                    {p.pirPerMin?.toFixed(2) ?? "–"}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-neutral-300">
                    {p.last3.toFixed(1)}
                  </td>
                  <td
                    className={`px-2 py-2 text-right tabular-nums ${
                      d === null ? "text-neutral-600" : d > 0 ? "text-emerald-400" : d < 0 ? "text-red-400" : ""
                    }`}
                  >
                    {d === null ? "–" : signed(d)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-neutral-500">
        Range is a player&apos;s typical game: average PIR ± one standard
        deviation (the bar; the tick is the average). Var. is that spread
        divided by the average, so lower means steadier. vs LY compares with
        last season (10+ games). The watch list shows trends in the numbers,
        not predictions, and early in the season they rest on few games.
        Fantasy prices aren&apos;t in the official data, so value for money
        isn&apos;t shown.
      </p>
    </div>
  );
}
