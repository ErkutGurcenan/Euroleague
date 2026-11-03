"use client";

import Link from "@/components/Link";
import { createContext, useContext, useEffect, useState } from "react";
import type { ClubBadge, LiveGame, LiveScores } from "@/lib/api";

const POLL_MS = 30_000;
const LiveContext = createContext<LiveScores | null>(null);

/** Holds the page's live scores and re-reads them every 30 seconds while a
    game is on or about to start (and the tab is visible); stops otherwise.
    Without a provider the live pieces below simply show their fallback. */
export function LiveScoresProvider({ initial, children }: { initial: LiveScores | null; children: React.ReactNode }) {
  const [data, setData] = useState<LiveScores | null>(initial);
  const active = data?.active ?? false;
  useEffect(() => {
    if (!active) return;
    let stopped = false;
    const id = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/live-scores", { cache: "no-store" });
        if (res.ok && !stopped) setData(await res.json());
      } catch {
        // keep the last scores and try again next time
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [active]);
  return <LiveContext.Provider value={data}>{children}</LiveContext.Provider>;
}

/** The live state of a game, matched on its unique id or on season + game number
    (game numbers repeat every season). Only live or finished-but-not-imported games. */
function useLiveGame(key: { id?: string; season?: string; gameCode: number }): LiveGame | undefined {
  const g = useContext(LiveContext)?.games.find((x) =>
    key.id ? x.id === key.id : x.season === key.season && x.gameCode === key.gameCode);
  return g && g.status !== "scheduled" && !g.imported ? g : undefined;
}

/** "Q3 04:12", "Half-time", "OT 02:10", "Final" */
export function liveStatus(g: LiveGame): string {
  if (g.status === "final") return "Final";
  const q = Number(g.quarter);
  if (!q) return "Live";
  const atBreak = g.clock === "00:00";
  if (q > 4) {
    const ot = q - 4 > 1 ? `OT${q - 4}` : "OT";
    return atBreak ? `End of ${ot}` : `${ot} ${g.clock ?? ""}`.trim();
  }
  if (atBreak) return q === 2 ? "Half-time" : `End of Q${q}`;
  return `Q${q} ${g.clock ?? ""}`.trim();
}

export function LiveDot() {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
    </span>
  );
}

function Crest({ team }: { team: ClubBadge }) {
  return team.clubCrest ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={team.clubCrest} alt="" className="h-4 w-4 object-contain" />
  ) : null;
}

/** Home page: games on now and those just finished, each linking to its match page. */
export function LiveStrip() {
  const games = (useContext(LiveContext)?.games ?? []).filter((g) => g.status !== "scheduled");
  if (games.length === 0) return null;
  const anyLive = games.some((g) => g.status === "live");
  return (
    <section className="mb-6 grid gap-2">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-400">
        {anyLive && <LiveDot />}
        {anyLive ? "Live now" : "Just finished"}
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g) => (
          <Link
            key={g.id}
            href={`/games/${g.gameCode}`}
            className={`flex items-center justify-between gap-3 rounded-lg border bg-neutral-900/60 px-3 py-2 text-sm transition-colors ${
              g.status === "live" ? "border-red-500/40 hover:border-red-400" : "border-neutral-800 hover:border-neutral-600"
            }`}
          >
            <span className="flex min-w-0 items-center gap-1.5 tabular-nums">
              <Crest team={g.home} />
              <span>{g.home.clubCode}</span>
              <span className="font-bold">{g.homeScore ?? 0}</span>
              <span className="text-neutral-500">–</span>
              <span className="font-bold">{g.awayScore ?? 0}</span>
              <span>{g.away.clubCode}</span>
              <Crest team={g.away} />
            </span>
            <span className={`shrink-0 text-xs ${g.status === "live" ? "text-red-400" : "text-neutral-400"}`}>
              {liveStatus(g)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Game card corner: "● LIVE · Q3 04:12" while a game is on, else the given date. */
export function LiveDateSlot({ id, children }: { id: string; children: React.ReactNode }) {
  const g = useLiveGame({ id, gameCode: 0 });
  if (!g) return <>{children}</>;
  return (
    <span className={`flex items-center gap-1.5 ${g.status === "live" ? "text-red-400" : "text-neutral-400"}`}>
      {g.status === "live" && <LiveDot />}
      {g.status === "live" ? `LIVE · ${liveStatus(g)}` : "Final"}
    </span>
  );
}

/** Game card score: the live score while a game is on, else the given score. */
export function LiveSideScore({ id, side, children }: { id: string; side: "home" | "away"; children: React.ReactNode }) {
  const g = useLiveGame({ id, gameCode: 0 });
  if (!g) return <>{children}</>;
  return <>{side === "home" ? g.homeScore ?? 0 : g.awayScore ?? 0}</>;
}

/** Points in each period from the feed's running totals; the period being
    played uses the current score, overtime periods are added up. */
function periodPoints(totals: (number | null)[], score: number | null, periods: number): number[] {
  const out: number[] = [];
  let before = 0;
  for (let i = 0; i < Math.min(periods, 4); i++) {
    const current = i === periods - 1 && periods <= 4;
    const after = current ? score ?? totals[i] ?? before : totals[i] ?? before;
    out.push(after - before);
    before = after;
  }
  if (periods > 4) out.push((score ?? before) - before);
  return out;
}

/** Match page: the live score, period and clock, and points per period,
    updating by itself; the normal scoreboard once the result is imported. */
export function LiveScoreboard({ season, gameCode, homeName, awayName, children }: {
  season: string;
  gameCode: number;
  homeName: string;
  awayName: string;
  children: React.ReactNode;
}) {
  const g = useLiveGame({ season, gameCode });
  if (!g) return <>{children}</>;
  const q = Number(g.quarter);
  const overtime = g.status === "final"
    ? (g.homeScore ?? 0) > (g.quarters.home[3] ?? 0) || (g.awayScore ?? 0) > (g.quarters.away[3] ?? 0)
    : q > 4;
  const periods = g.status === "final" ? (overtime ? 5 : 4) : Math.max(q, 1);
  const home = periodPoints(g.quarters.home, g.homeScore, periods);
  const away = periodPoints(g.quarters.away, g.awayScore, periods);
  const labels = ["Q1", "Q2", "Q3", "Q4", "OT"].slice(0, home.length);
  return (
    <div className="mt-3 grid justify-items-center gap-2">
      <div className={`flex items-center gap-2 text-sm font-semibold ${g.status === "live" ? "text-red-400" : "text-neutral-400"}`}>
        {g.status === "live" && <LiveDot />}
        {g.status === "live" ? `LIVE · ${liveStatus(g)}` : "Final"}
      </div>
      <div className="flex items-center justify-center gap-6 text-4xl font-bold tabular-nums">
        <span>{g.homeScore ?? 0}</span>
        <span className="text-lg text-neutral-500">:</span>
        <span>{g.awayScore ?? 0}</span>
      </div>
      <table className="text-sm tabular-nums text-neutral-200">
        <thead>
          <tr className="text-xs uppercase text-neutral-600">
            <th className="px-3 text-left" />
            {labels.map((l) => <th key={l} className="px-3 font-normal">{l}</th>)}
          </tr>
        </thead>
        <tbody>
          {([[homeName, home], [awayName, away]] as const).map(([name, pts]) => (
            <tr key={name}>
              <td className="px-3 text-left text-neutral-500">{name}</td>
              {pts.map((p, i) => <td key={i} className="px-3 text-center">{p}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-neutral-500">
        {g.status === "live"
          ? "Updates every 30 seconds from the official live feed."
          : "The full box score and stats arrive in a few minutes."}
      </p>
    </div>
  );
}
