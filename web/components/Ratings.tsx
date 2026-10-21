import Link from "next/link";
import type { PowerRanking, TeamOdds } from "@/lib/api";

function TeamCell({ t }: { t: { clubCode: string; clubName: string; clubCrest: string | null } }) {
  return (
    <Link href={`/teams/${t.clubCode}`} className="flex items-center gap-2 hover:text-orange-400">
      {t.clubCrest && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t.clubCrest} alt="" className="h-5 w-5 object-contain" />
      )}
      <span className="truncate">{t.clubName}</span>
    </Link>
  );
}

function Trend({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const span = hi - lo || 1;
  const xy = points.map((v, i) => [4 + (i * 92) / (points.length - 1), 20 - ((v - lo) / span) * 16]);
  const up = points[points.length - 1] >= points[0];
  const color = up ? "#34d399" : "#f87171";
  const last = xy[xy.length - 1];
  return (
    <svg width="100" height="24" viewBox="0 0 100 24" aria-hidden="true">
      <polyline points={xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")} fill="none" stroke={color} strokeWidth="1.6" />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill={color} />
    </svg>
  );
}

function change(n: number) {
  const r = Math.round(n * 10) / 10;
  if (r === 0) return <span className="text-neutral-500">0.0</span>;
  return <span className={r > 0 ? "text-emerald-400" : "text-red-400"}>{r > 0 ? "▲" : "▼"} {Math.abs(r).toFixed(1)}</span>;
}

export function PowerRankingsTable({ teams }: { teams: PowerRanking[] }) {
  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-2 py-2 text-right">Rating</th>
              <th className="px-2 py-2 text-right">Last game</th>
              <th className="px-2 py-2 text-right">Season</th>
              <th className="px-2 py-2 text-right">W–L</th>
              <th className="px-2 py-2 text-right" title="Chance to beat an average EuroLeague team on a neutral court">vs avg</th>
              <th className="px-3 py-2">Trend</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.clubCode} className="border-t border-neutral-800/60 hover:bg-neutral-900/60">
                <td className="px-3 py-2 text-neutral-500">{t.rank}</td>
                <td className="px-3 py-2"><TeamCell t={t} /></td>
                <td className="px-2 py-2 text-right font-semibold tabular-nums">{t.rating}</td>
                <td className="px-2 py-2 text-right text-xs tabular-nums">{change(t.change)}</td>
                <td className="px-2 py-2 text-right text-xs tabular-nums">{change(t.seasonChange)}</td>
                <td className="px-2 py-2 text-right tabular-nums text-neutral-300">{t.wins}–{t.losses}</td>
                <td className="px-2 py-2 text-right tabular-nums text-neutral-300">{Math.round(t.beatsAverage * 100)}%</td>
                <td className="px-3 py-1"><Trend points={t.trend} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-500">
        Elo ratings updated after every game since 2016-17: beating a strong team or winning big moves
        a rating more, and home court is worth about 100 points. 1500 is average. &quot;vs avg&quot; is the
        chance of beating an average team on a neutral court. Every summer ratings move 30% back
        toward average; new clubs start just below it. Trend shows the last ten games.
      </p>
    </div>
  );
}

function pct(p: number): string {
  if (p <= 0) return "–";
  if (p < 0.01) return "<1%";
  if (p > 0.99 && p < 1) return ">99%";
  return `${Math.round(p * 100)}%`;
}

function Prob({ p }: { p: number }) {
  return (
    <span className="grid min-w-[5.5rem] grid-cols-[2.5rem_minmax(2rem,1fr)] items-center gap-1.5">
      <span className="text-right tabular-nums">{pct(p)}</span>
      <span className="block h-1.5 overflow-hidden rounded bg-neutral-800">
        <span className="block h-full bg-orange-500" style={{ width: `${Math.min(100, p * 100)}%` }} />
      </span>
    </span>
  );
}

export function OddsTable({ teams, simulations, remainingGames }: { teams: TeamOdds[]; simulations: number; remainingGames: number }) {
  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-3 py-2">Team</th>
              <th className="px-2 py-2 text-right">Now</th>
              <th className="px-2 py-2 text-right">Projected</th>
              <th className="px-2 py-2">1st place</th>
              <th className="px-2 py-2">Top 6</th>
              <th className="px-2 py-2">Play-in</th>
              <th className="px-2 py-2">Playoffs</th>
              <th className="px-2 py-2">Final Four</th>
              <th className="px-3 py-2">Title</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.clubCode} className="border-t border-neutral-800/60 hover:bg-neutral-900/60">
                <td className="px-3 py-2"><TeamCell t={t} /></td>
                <td className="px-2 py-2 text-right tabular-nums text-neutral-400">{t.wins}–{t.losses}</td>
                <td className="px-2 py-2 text-right font-semibold tabular-nums">
                  {Math.round(t.projWins)}–{Math.round(t.projLosses)}
                </td>
                <td className="px-2 py-2"><Prob p={t.firstSeed} /></td>
                <td className="px-2 py-2"><Prob p={t.top6} /></td>
                <td className="px-2 py-2"><Prob p={t.playIn} /></td>
                <td className="px-2 py-2"><Prob p={t.playoffs} /></td>
                <td className="px-2 py-2"><Prob p={t.finalFour} /></td>
                <td className="px-3 py-2"><Prob p={t.champion} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-500">
        The remaining {remainingGames} regular-season games, the play-in, best-of-five playoffs and the
        Final Four, played out {simulations.toLocaleString("en-GB")} times with the current power ratings
        (each simulated season nudges every rating by a random amount, because ratings are uncertain).
        Top 6 go straight to the playoffs; 7th–10th play the play-in. Updated every night.
      </p>
    </div>
  );
}
