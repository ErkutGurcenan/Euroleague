"use client";

import Link from "@/components/Link";
import { createContext, useContext, useEffect, useState } from "react";
import type { ClubBadge, LiveBoxPlayer, LiveGame, LiveScores } from "@/lib/api";
import { clubAbbr } from "@/lib/clubs";

const POLL_MS = 30_000;
const LiveContext = createContext<LiveScores | null>(null);

/** Holds the page's live scores and re-reads them every 30 seconds while a
    game is on or about to start (and the tab is visible); stops otherwise.
    Without a provider the live pieces below simply show their fallback. */
export function LiveScoresProvider({ initial, query = "", children }: {
  initial: LiveScores | null;
  /** e.g. "?game=81&season=E2026" to also get that game's box score and win probability */
  query?: string;
  children: React.ReactNode;
}) {
  const [data, setData] = useState<LiveScores | null>(initial);
  const active = data?.active ?? false;
  useEffect(() => {
    if (!active) return;
    let stopped = false;
    const id = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/live-scores${query}`, { cache: "no-store" });
        if (res.ok && !stopped) setData(await res.json());
      } catch {
        // keep the last scores and try again next time
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [active, query]);
  return <LiveContext.Provider value={data}>{children}</LiveContext.Provider>;
}

/** The live state of a game, matched on its unique id or on season + game number
    (game numbers repeat every season). Only live or finished-but-not-imported games. */
function useLiveGame(key: { id?: string; season?: string; gameCode: number }): LiveGame | undefined {
  const g = useContext(LiveContext)?.games.find((x) =>
    key.id ? x.id === key.id : x.season === key.season && x.gameCode === key.gameCode);
  return g && g.status !== "scheduled" && !g.imported ? g : undefined;
}

function useLiveDetail(gameCode: number) {
  const detail = useContext(LiveContext)?.detail;
  return detail && detail.gameCode === gameCode ? detail : null;
}

function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

/** The home team's win probability through the game so far: 0-40 minutes
    (plus any overtime) across, 0-100% up, 50% dashed. */
function WinProbChart({ points, homeName, awayName }: { points: [number, number][]; homeName: string; awayName: string }) {
  if (points.length < 2) return null;
  const end = Math.max(40, points[points.length - 1][0]);
  const x = (m: number) => 4 + (m / end) * 292;
  const y = (p: number) => 4 + (1 - p) * 72;
  return (
    <svg viewBox="0 0 300 80" className="w-full" role="img"
      aria-label={`${homeName} win probability during the game`}>
      <line x1="4" x2="296" y1={y(0.5)} y2={y(0.5)} stroke="#404040" strokeDasharray="3 3" />
      {[10, 20, 30].map((m) => <line key={m} x1={x(m)} x2={x(m)} y1="4" y2="76" stroke="#262626" />)}
      <text x="6" y="12" fontSize="8" fill="#737373">{homeName}</text>
      <text x="6" y="74" fontSize="8" fill="#737373">{awayName}</text>
      <polyline points={points.map(([m, p]) => `${x(m).toFixed(1)},${y(p).toFixed(1)}`).join(" ")}
        fill="none" stroke="#fb923c" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
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
              <span>{clubAbbr(g.home.clubCode)}</span>
              <span className="font-bold">{g.homeScore ?? 0}</span>
              <span className="text-neutral-500">–</span>
              <span className="font-bold">{g.awayScore ?? 0}</span>
              <span>{clubAbbr(g.away.clubCode)}</span>
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
  const detail = useLiveDetail(gameCode);
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
      {g.homeWinProb !== null && (
        <div className="grid w-full max-w-sm gap-1">
          <div className="flex justify-between text-xs text-neutral-400">
            <span>Win probability</span>
            <span className="tabular-nums">{`${homeName} ${pct(g.homeWinProb)} · ${awayName} ${pct(1 - g.homeWinProb)}`}</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded bg-neutral-800">
            <div className="bg-orange-500" style={{ width: `${g.homeWinProb * 100}%` }} />
          </div>
          {detail && <WinProbChart points={detail.winProbs} homeName={homeName} awayName={awayName} />}
        </div>
      )}
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
          ? "Updates every 30 seconds from the official live feed. The win probability starts from our pre-game call and moves with the score and the clock."
          : "The full box score and stats arrive in a few minutes."}
      </p>
    </div>
  );
}

function BoxTable({ name, players }: { name: string; players: LiveBoxPlayer[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-800">
      <table className="w-full whitespace-nowrap text-sm tabular-nums">
        <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
          <tr>
            <th className="px-3 py-2">{name}</th>
            {["Min", "Pts", "Reb", "Ast", "PIR"].map((h) => <th key={h} className="px-2 py-2 text-right">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={`${p.no}-${p.name}`} className="border-t border-neutral-800/60">
              <td className="px-3 py-1.5">
                <span className="mr-1.5 inline-block w-5 text-right text-xs text-neutral-500">{p.no}</span>
                <span className={p.starter ? "font-semibold" : ""}>{p.name}</span>
                {p.on && <span className="ml-1.5 rounded bg-emerald-500/15 px-1 text-[10px] text-emerald-400">on court</span>}
              </td>
              {p.min === "DNP" || !p.min ? (
                <td colSpan={5} className="px-2 py-1.5 text-right text-xs text-neutral-500">did not play</td>
              ) : (
                [p.min, p.pts, p.reb, p.ast, p.pir].map((v, i) => (
                  <td key={i} className="px-2 py-1.5 text-right">{v ?? "–"}</td>
                ))
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Match page: the live box score while the game is on (from the official
    live feed); the full box score replaces it once the result is imported. */
export function LiveBoxScore({ season, gameCode, homeName, awayName }: {
  season: string;
  gameCode: number;
  homeName: string;
  awayName: string;
}) {
  const g = useLiveGame({ season, gameCode });
  const detail = useLiveDetail(gameCode);
  if (!g || !detail?.box) return null;
  return (
    <section className="mb-8 grid gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {g.status === "live" && <LiveDot />}
        Live box score
      </h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <BoxTable name={homeName} players={detail.box.home.players} />
        <BoxTable name={awayName} players={detail.box.away.players} />
      </div>
      <p className="text-xs text-neutral-500">Starters in bold. Updates every 30 seconds.</p>
    </section>
  );
}

