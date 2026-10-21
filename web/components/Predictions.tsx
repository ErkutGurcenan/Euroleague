import Link from "next/link";
import type { ClubBadge, Prediction, PredictionsOverview } from "@/lib/api";

function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

function Crest({ team, size = 20 }: { team: ClubBadge; size?: number }) {
  return team.clubCrest ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={team.clubCrest} alt="" className="object-contain" style={{ width: size, height: size }} />
  ) : null;
}

/** Plain-language reasons behind a call, biggest push first. */
export function keyFactors(p: Prediction): string[] {
  const items: [number, string][] = [];
  const f = p.factors;
  if (p.homeCourt && f.home_court) items.push([Math.abs(f.home_court), `Home court: ${p.home.clubCode}`]);
  if (f.rating_diff && Math.abs(p.ratingDiff) >= 5) {
    const lead = p.ratingDiff > 0 ? p.home.clubCode : p.away.clubCode;
    items.push([Math.abs(f.rating_diff), `Power rating: ${lead} +${Math.round(Math.abs(p.ratingDiff))}`]);
  }
  if (f.net_diff && Math.abs(p.netDiff) >= 0.5) {
    const lead = p.netDiff > 0 ? p.home.clubCode : p.away.clubCode;
    items.push([Math.abs(f.net_diff), `Efficiency: ${lead} +${Math.abs(p.netDiff).toFixed(1)} per 100`]);
  }
  return items.sort((a, b) => b[0] - a[0]).map(([, label]) => label);
}

function ProbBar({ p, height = "h-7" }: { p: Prediction; height?: string }) {
  const h = p.homeWinProb;
  const homeFav = h >= 0.5;
  return (
    <div className={`flex ${height} overflow-hidden rounded-md text-xs font-semibold`}>
      <div
        className={`flex items-center px-2 ${homeFav ? "bg-orange-600 text-white" : "bg-neutral-800 text-neutral-300"}`}
        style={{ width: `${Math.max(h, 0.12) * 100}%` }}
      >
        {p.home.clubCode} {pct(h)}
      </div>
      <div
        className={`flex items-center justify-end px-2 ${!homeFav ? "bg-orange-600 text-white" : "bg-neutral-800 text-neutral-300"}`}
        style={{ width: `${Math.max(1 - h, 0.12) * 100}%` }}
      >
        {pct(1 - h)} {p.away.clubCode}
      </div>
    </div>
  );
}

function marginText(p: Prediction): string {
  const m = p.homeMargin;
  if (Math.abs(m) < 0.5) return "Expected to be a toss-up";
  const team = m > 0 ? p.home.clubName : p.away.clubName;
  return `Expected margin: ${team} by ${Math.abs(m).toFixed(1)}`;
}

/** Match page: the model's call, or for finished games the pre-game call graded. */
export function PredictionCard({ p }: { p: Prediction }) {
  const favourite = p.homeWinProb >= 0.5 ? p.home : p.away;
  const favProb = Math.max(p.homeWinProb, 1 - p.homeWinProb);
  return (
    <div className="grid gap-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      {p.result ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-neutral-400">Our pre-game call:</span>
          <span className="font-semibold">{favourite.clubName} {pct(favProb)}</span>
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${
              p.result.correct ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
            }`}
          >
            {p.result.correct ? "Correct" : "Missed"}
          </span>
        </div>
      ) : (
        <div className="text-sm text-neutral-400">{marginText(p)}</div>
      )}
      <ProbBar p={p} />
      <div className="flex flex-wrap gap-1.5">
        {keyFactors(p).map((k) => (
          <span key={k} className="rounded-full border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-xs text-neutral-400">
            {k}
          </span>
        ))}
      </div>
      <p className="text-xs text-neutral-500">
        Ratings alone give {p.home.clubCode} {pct(p.eloHomeProb)}. The call combines power ratings,
        season efficiency and home court, is updated every night and is locked at tip-off.{" "}
        <Link href="/predictions" className="text-orange-400 hover:underline">Track record →</Link>
      </p>
    </div>
  );
}

function when(iso: string | null): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  });
}

export function UpcomingList({ items }: { items: Prediction[] }) {
  if (items.length === 0) return <p className="text-sm text-neutral-500">No games in the next week.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-800">
      <table className="w-full whitespace-nowrap text-sm">
        <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
          <tr>
            <th className="px-3 py-2">When (UTC)</th>
            <th className="px-3 py-2">Game</th>
            <th className="px-3 py-2">Win probability</th>
            <th className="px-3 py-2 text-right">Expected margin</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.gameCode} className="border-t border-neutral-800/60 hover:bg-neutral-900/60">
              <td className="px-3 py-2 text-xs text-neutral-500">{when(p.utcDate)}</td>
              <td className="px-3 py-2">
                <Link href={`/games/${p.gameCode}`} className="flex items-center gap-1.5 hover:text-orange-400">
                  <Crest team={p.home} size={16} /> {p.home.clubCode}
                  <span className="text-neutral-600">v</span>
                  <Crest team={p.away} size={16} /> {p.away.clubCode}
                </Link>
              </td>
              <td className="min-w-[14rem] px-3 py-2"><ProbBar p={p} height="h-5" /></td>
              <td className="px-3 py-2 text-right tabular-nums text-neutral-300">
                {Math.abs(p.homeMargin) < 0.5 ? "even" : `${p.homeMargin > 0 ? p.home.clubCode : p.away.clubCode} +${Math.abs(p.homeMargin).toFixed(1)}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-3">
      <div className="text-xs uppercase text-neutral-500">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-neutral-500">{sub}</div>
    </div>
  );
}

export function TrackRecord({ data }: { data: PredictionsOverview }) {
  const r = data.record;
  if (!r.games) {
    return (
      <p className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-400">
        The live track record starts with Round 7 of 2026-27: every call is saved before tip-off and
        graded here after the game. Until then, the backtest below shows how the model would have done
        in past seasons.
      </p>
    );
  }
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Record" value={`${r.correct}–${r.games - (r.correct ?? 0)}`} sub={`${pct(r.accuracy ?? 0)} of winners picked`} />
        <Stat label="Ratings alone" value={pct(data.eloRecord.accuracy ?? 0)} sub="same games, power ratings only" />
        <Stat label="Log loss" value={(r.logLoss ?? 0).toFixed(3)} sub="lower is better · coin flip 0.693" />
      </div>
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-3 py-2">Game</th>
              <th className="px-3 py-2">Call</th>
              <th className="px-3 py-2">Result</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {data.recent.map((p) => {
              const fav = p.homeWinProb >= 0.5 ? p.home : p.away;
              return (
                <tr key={p.gameCode} className="border-t border-neutral-800/60">
                  <td className="px-3 py-2">
                    <Link href={`/games/${p.gameCode}`} className="hover:text-orange-400">
                      {p.home.clubCode} v {p.away.clubCode}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-neutral-300">{fav.clubCode} {pct(Math.max(p.homeWinProb, 1 - p.homeWinProb))}</td>
                  <td className="px-3 py-2 tabular-nums text-neutral-400">{p.result?.homeScore}–{p.result?.awayScore}</td>
                  <td className="px-3 py-2">
                    <span className={p.result?.correct ? "text-emerald-400" : "text-red-400"}>{p.result?.correct ? "✓" : "✗"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Calibration({ bins }: { bins: PredictionsOverview["backtest"]["calibration"] }) {
  const x = (v: number) => 30 + v * 200;
  const y = (v: number) => 176 - v * 160;
  return (
    <svg viewBox="0 0 240 200" className="w-full max-w-xs" role="img" aria-label="Calibration: predicted home win chance against how often the home team won">
      <g fontSize="9" fill="#737373" fontFamily="inherit">
        <text x={x(0)} y="192" textAnchor="middle">0%</text>
        <text x={x(0.5)} y="192" textAnchor="middle">50%</text>
        <text x={x(1)} y="192" textAnchor="middle">100%</text>
        <text x="24" y={y(0) + 3} textAnchor="end">0%</text>
        <text x="24" y={y(0.5) + 3} textAnchor="end">50%</text>
        <text x="24" y={y(1) + 3} textAnchor="end">100%</text>
      </g>
      <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(0)} stroke="#2a2a2a" />
      <line x1={x(0)} y1={y(0)} x2={x(0)} y2={y(1)} stroke="#2a2a2a" />
      <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="#525252" strokeDasharray="4 4" />
      <polyline
        points={bins.map((b) => `${x(b.predicted).toFixed(1)},${y(b.actual).toFixed(1)}`).join(" ")}
        fill="none" stroke="#fb923c" strokeWidth="2"
      />
      {bins.map((b) => (
        <circle key={b.from} cx={x(b.predicted)} cy={y(b.actual)} r="3.5" fill="#fb923c">
          <title>{`Called ${Math.round(b.predicted * 100)}%, home team won ${Math.round(b.actual * 100)}% (${b.games} games)`}</title>
        </circle>
      ))}
    </svg>
  );
}

export function BacktestPanel({ data }: { data: PredictionsOverview }) {
  const b = data.backtest;
  const bars: [string, number | null, string][] = [
    ["Home team always wins", b.homeAlways.accuracy, "bg-neutral-500"],
    ["Power ratings only", b.elo.accuracy, "bg-orange-500/60"],
    ["Eurostepper model", b.model.accuracy, "bg-orange-500"],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="grid content-start gap-4">
        <div className="grid gap-3">
          {bars.map(([label, acc, color]) => (
            <div key={label} className="grid gap-1">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-300">{label}</span>
                <span className="font-semibold tabular-nums">{acc !== null ? `${(acc * 100).toFixed(1)}%` : "–"}</span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-neutral-800">
                <div className={`h-full ${color}`} style={{ width: `${(acc ?? 0) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-neutral-400">
          Winners picked in {b.model.games.toLocaleString("en-GB")} games, each season predicted by a model
          trained only on the seasons before it. When the model called a game at 70% or more, the
          favourite won {pct(b.favourites70.accuracy ?? 0)} of {b.favourites70.games.toLocaleString("en-GB")} times.
        </p>
        <div className="overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
              <tr>
                <th className="px-3 py-2">Season</th>
                <th className="px-2 py-2 text-right">Games</th>
                <th className="px-2 py-2 text-right">Correct</th>
                <th className="px-3 py-2 text-right">Log loss</th>
              </tr>
            </thead>
            <tbody>
              {b.seasons.map((s) => (
                <tr key={s.season} className="border-t border-neutral-800/60">
                  <td className="px-3 py-1.5 text-neutral-300">{s.seasonLabel}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-neutral-400">{s.games}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{s.accuracy !== null ? `${(s.accuracy * 100).toFixed(1)}%` : "–"}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-neutral-400">{s.logLoss?.toFixed(3) ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid content-start gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Calibration</h3>
        <Calibration bins={b.calibration} />
        <p className="text-sm text-neutral-400">
          Each dot groups games by the model&apos;s home win chance (across) and shows how often the home
          team actually won (up). Dots near the dashed line mean the percentages can be taken at face value.
        </p>
        <p className="text-xs text-neutral-500">
          The power ratings&apos; own settings were tuned on these same seasons, so their figure is slightly
          flattering. Recent form, rest days and player availability were tested and left out because
          they didn&apos;t improve the backtest.
        </p>
      </div>
    </div>
  );
}
