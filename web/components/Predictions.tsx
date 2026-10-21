import Link from "next/link";
import type { ClubBadge, PaperGame, PaperTrade, Prediction, PredictionsOverview, StrategySummary } from "@/lib/api";

function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

/** A share price in cents: 0.78 -> "78¢", 0.245 -> "24.5¢". */
function cents(p: number): string {
  const c = Math.round(p * 1000) / 10;
  return Number.isInteger(c) ? `${c}¢` : `${c.toFixed(1)}¢`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function money(x: number): string {
  return `${x >= 0 ? "+" : "−"}$${Math.abs(x).toFixed(2)}`;
}

function utcTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

const STRATEGY_LABEL: Record<string, string> = { eurostepper: "Eurostepper", jev: "Jev AI" };

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

function favouriteOf(homeProb: number, p: Prediction): { team: ClubBadge; prob: number } {
  return homeProb >= 0.5 ? { team: p.home, prob: homeProb } : { team: p.away, prob: 1 - homeProb };
}

/** Jev's call for the same game, graded after the game. */
function AiLine({ p }: { p: Prediction }) {
  if (!p.ai) return null;
  const ai = favouriteOf(p.ai.homeWinProb, p);
  const ours = favouriteOf(p.homeWinProb, p);
  const disagree = ai.team.clubCode !== ours.team.clubCode;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm">
      <span className="text-neutral-400">{p.result ? "Jev AI's pre-game call:" : "Jev AI's call:"}</span>
      <span className="font-semibold">{ai.team.clubName} {pct(ai.prob)}</span>
      {p.result && p.ai.correct !== undefined ? (
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${p.ai.correct ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
          {p.ai.correct ? "Correct" : "Missed"}
        </span>
      ) : (
        disagree && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-300">disagrees with us</span>
      )}
      <span className="w-full text-xs text-neutral-500">
        TypeSafe&apos;s Jev, given the same kind of facts (records, form, ratings, efficiency, home court) but not our prediction.
      </span>
    </div>
  );
}

/** Polymarket's price for the game and, once it has tipped off, the paper trades on it. */
function MarketLine({ p }: { p: Prediction }) {
  if (!p.market) return null;
  const m = favouriteOf(p.market.homePrice, p);
  const trades = (p.paperTrades ?? []).filter((t) => t.side && t.price !== null);
  return (
    <div className="grid gap-1 rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-neutral-400">{p.result ? "Polymarket before tip-off:" : "Polymarket:"}</span>
        <span className="font-semibold">{m.team.clubName} {pct(m.prob)}</span>
        <span className="text-xs text-neutral-500">
          {p.market.bid !== null && p.market.ask !== null && `${p.home.clubCode} bid ${cents(p.market.bid)} · ask ${cents(p.market.ask)} · `}
          {utcTime(p.market.capturedAt)} UTC
        </span>
      </div>
      {trades.map((t) => (
        <div key={t.strategy} className="text-xs text-neutral-400">
          Paper trade, {STRATEGY_LABEL[t.strategy] ?? t.strategy}: bought {t.shares} {(t.side === "home" ? p.home : p.away).clubCode} shares at {cents(t.price ?? 0)}
          {t.pnl !== null ? (
            <span className={t.pnl >= 0 ? "text-emerald-400" : "text-red-400"}> {money(t.pnl)}</span>
          ) : (
            <span className="text-neutral-500"> (open)</span>
          )}
        </div>
      ))}
    </div>
  );
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
      {p.ai && (!p.result || p.ai.preGame) && <AiLine p={p} />}
      <MarketLine p={p} />
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
            <th className="px-3 py-2 text-right">Jev AI</th>
            <th className="px-3 py-2 text-right">Polymarket</th>
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
              <td className="px-3 py-2 text-right tabular-nums">
                {p.ai ? (() => {
                  const ai = favouriteOf(p.ai.homeWinProb, p);
                  const disagree = ai.team.clubCode !== favouriteOf(p.homeWinProb, p).team.clubCode;
                  return (
                    <span className={disagree ? "text-amber-300" : "text-neutral-400"} title={disagree ? "Jev picks a different winner" : undefined}>
                      {ai.team.clubCode} {pct(ai.prob)}
                    </span>
                  );
                })() : <span className="text-neutral-600">–</span>}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {p.market ? (() => {
                  const m = favouriteOf(p.market.homePrice, p);
                  const quote = p.market.bid !== null && p.market.ask !== null
                    ? `${p.home.clubCode} bid ${cents(p.market.bid)} · ask ${cents(p.market.ask)} · ` : "";
                  return (
                    <span className="text-neutral-400" title={`${quote}${utcTime(p.market.capturedAt)} UTC`}>
                      {m.team.clubCode} {pct(m.prob)}
                    </span>
                  );
                })() : <span className="text-neutral-600">–</span>}
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

export function ChallengerPanel({ data }: { data: PredictionsOverview }) {
  const c = data.challenger;
  const card = (label: string, sc: typeof c.ours, highlight: boolean) => (
    <div className={`rounded-lg border bg-neutral-900/40 px-4 py-3 ${highlight ? "border-orange-600/60" : "border-neutral-800"}`}>
      <div className="text-xs uppercase text-neutral-500">{label}</div>
      <div className="text-2xl font-bold tabular-nums">
        {sc.games ? `${sc.correct}–${sc.games - (sc.correct ?? 0)}` : "–"}
      </div>
      <div className="text-xs text-neutral-500">
        {sc.games ? `${pct(sc.accuracy ?? 0)} correct · log loss ${(sc.logLoss ?? 0).toFixed(3)} · Brier ${(sc.brier ?? 0).toFixed(3)}` : "no graded games yet"}
      </div>
    </div>
  );
  const oursBetter = c.games > 0 && (c.ours.logLoss ?? 9) < (c.ai.logLoss ?? 9);
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {card("Eurostepper model", c.ours, oursBetter)}
        {card(c.provider, c.ai, c.games > 0 && !oursBetter)}
      </div>
      {c.games === 0 ? (
        <p className="text-sm text-neutral-400">
          Both models have called every game of the next week ({`${c.upcomingCalls} games`}), before tip-off.
          The scores start filling in after Round 7&apos;s first games are played.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
              <tr>
                <th className="px-3 py-2">Game</th>
                <th className="px-3 py-2">Result</th>
                <th className="px-3 py-2">Eurostepper</th>
                <th className="px-3 py-2">Jev</th>
              </tr>
            </thead>
            <tbody>
              {c.recent.map((p) => {
                const homeWon = (p.result?.homeScore ?? 0) > (p.result?.awayScore ?? 0);
                const call = (prob: number) => {
                  const f = favouriteOf(prob, p);
                  const right = (prob >= 0.5) === homeWon;
                  return (
                    <span className={right ? "text-emerald-400" : "text-red-400"}>
                      {f.team.clubCode} {pct(f.prob)} {right ? "✓" : "✗"}
                    </span>
                  );
                };
                return (
                  <tr key={p.gameCode} className="border-t border-neutral-800/60">
                    <td className="px-3 py-2">
                      <Link href={`/games/${p.gameCode}`} className="hover:text-orange-400">{p.home.clubCode} v {p.away.clubCode}</Link>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-neutral-400">{p.result?.homeScore}–{p.result?.awayScore}</td>
                    <td className="px-3 py-2 tabular-nums">{call(p.homeWinProb)}</td>
                    <td className="px-3 py-2 tabular-nums">{p.ai ? call(p.ai.homeWinProb) : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-neutral-500">
        Jev is TypeSafe&apos;s decision model. Before each game it gets the same kind of facts our model
        uses (records, last five results, power ratings, season efficiency, home court) but never our
        prediction, and answers which team wins with a probability for each side. Only calls made before
        tip-off count. Log loss and Brier score reward well-judged probabilities (lower is better);
        probabilities are capped at 1% and 99% for log loss so one certain miss can&apos;t dominate.
      </p>
    </div>
  );
}

/** Both models graded against Polymarket's last price before tip-off. */
export function MarketPanel({ data }: { data: PredictionsOverview }) {
  const m = data.market;
  const best = m.games ? Math.min(m.ours.logLoss ?? 9, m.ai.logLoss ?? 9, m.market.logLoss ?? 9) : null;
  const card = (label: string, sc: typeof m.ours) => (
    <div className={`rounded-lg border bg-neutral-900/40 px-4 py-3 ${best !== null && sc.logLoss === best ? "border-orange-600/60" : "border-neutral-800"}`}>
      <div className="text-xs uppercase text-neutral-500">{label}</div>
      <div className="text-2xl font-bold tabular-nums">
        {sc.games ? `${sc.correct}–${sc.games - (sc.correct ?? 0)}` : "–"}
      </div>
      <div className="text-xs text-neutral-500">
        {sc.games ? `${pct(sc.accuracy ?? 0)} correct · log loss ${(sc.logLoss ?? 0).toFixed(3)} · Brier ${(sc.brier ?? 0).toFixed(3)}` : "no graded games yet"}
      </div>
    </div>
  );
  const d = m.disagree;
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {card("Eurostepper model", m.ours)}
        {card("Jev AI", m.ai)}
        {card(m.source, m.market)}
      </div>
      {m.games === 0 ? (
        <p className="text-sm text-neutral-400">
          Polymarket prices are saved every 15 minutes until tip-off ({`${m.upcomingPriced} upcoming games so far`}).
          The comparison fills in as games are played.
        </p>
      ) : (
        <p className="text-sm text-neutral-400">
          {`Eurostepper picked a different winner from the market in ${d.ours.games} of ${plural(m.games, "game")} `
            + `and was right in ${d.ours.right}. Jev went against the market ${plural(d.ai.games, "time")} `
            + `and was right in ${d.ai.right}.`}
        </p>
      )}
      <p className="text-xs text-neutral-500">
        Polymarket is a prediction market where a share in the winning team pays $1, so a price of 77¢
        means traders give that team about a 77% chance. Each game is graded at the last price saved
        before tip-off (midway between the bid and the ask), on the same games for all three. The market
        already prices in what bettors know, injuries included, so matching its log loss is hard and
        beating it is the real test.
      </p>
    </div>
  );
}

function StrategyCard({ s }: { s: StrategySummary }) {
  const tone = s.settled === 0 ? "" : s.pnl >= 0 ? "text-emerald-400" : "text-red-400";
  const details = s.settled
    ? [`${s.won}–${s.lost}`, `staked $${s.staked.toFixed(2)}`, `fees $${s.fees.toFixed(2)}`,
       `return ${(s.roi ?? 0) >= 0 ? "+" : "−"}${Math.abs((s.roi ?? 0) * 100).toFixed(1)}%`]
    : ["no settled trades yet"];
  if (s.open) details.push(`${s.open} open ($${s.openStake.toFixed(2)})`);
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-3">
      <div className="text-xs uppercase text-neutral-500">{s.label}</div>
      <div className={`text-2xl font-bold tabular-nums ${tone}`}>{s.settled ? money(s.pnl) : "$0.00"}</div>
      <div className="text-xs text-neutral-500">{details.join(" · ")}</div>
    </div>
  );
}

const LINE: Record<string, string> = { eurostepper: "#fb923c", jev: "#38bdf8" };

function PnlChart({ series }: { series: PredictionsOverview["market"]["paper"]["series"] }) {
  const keys = ["eurostepper", "jev"] as const;
  const top = Math.max(10, ...series.flatMap((r) => keys.map((k) => Math.abs(r[k]))));
  const x = (i: number) => 52 + (i / Math.max(series.length - 1, 1)) * 536;
  const y = (v: number) => 95 - (v / top) * 80;
  return (
    <div className="grid gap-1 rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
      <div className="flex gap-4 text-xs text-neutral-400">
        {keys.map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4" style={{ background: LINE[k] }} />
            {STRATEGY_LABEL[k]}
          </span>
        ))}
      </div>
      <svg viewBox="0 0 600 190" className="w-full" role="img" aria-label="Paper trading profit after each settled game">
        <g fontSize="11" fill="#737373" fontFamily="inherit" textAnchor="end">
          <text x="46" y={y(top) + 4}>+${Math.round(top)}</text>
          <text x="46" y={y(0) + 4}>$0</text>
          <text x="46" y={y(-top) + 4}>−${Math.round(top)}</text>
        </g>
        <line x1="52" x2="588" y1={y(0)} y2={y(0)} stroke="#404040" strokeDasharray="4 4" />
        {keys.map((k) => (
          <polyline
            key={k}
            points={series.map((r, i) => `${x(i).toFixed(1)},${y(r[k]).toFixed(1)}`).join(" ")}
            fill="none" stroke={LINE[k]} strokeWidth="2" strokeLinejoin="round"
          />
        ))}
        {keys.map((k) =>
          series.map((r, i) => (
            <circle key={`${k}${r.gameCode}`} cx={x(i)} cy={y(r[k])} r="2.5" fill={LINE[k]}>
              <title>{`${STRATEGY_LABEL[k]} after ${r.label}: ${money(r[k])}`}</title>
            </circle>
          )),
        )}
      </svg>
      <p className="text-xs text-neutral-500">Running profit after each settled game, oldest first.</p>
    </div>
  );
}

function TradeCell({ t, g }: { t?: PaperTrade; g: PaperGame }) {
  if (!t) return <span className="text-neutral-600">–</span>;
  const model = t.modelHomeProb !== null ? <span className="text-neutral-500">{pct(t.modelHomeProb)} </span> : null;
  if (t.status === "skipped" || !t.side || t.price === null) {
    return <span className="text-neutral-500">{model}skipped: {t.note}</span>;
  }
  const team = t.side === "home" ? g.home : g.away;
  return (
    <span title={`Bought ${t.shares} ${team.clubCode} shares at ${cents(t.price)}: $${(t.cost ?? 0).toFixed(2)} plus $${(t.fee ?? 0).toFixed(2)} fee`}>
      {model}
      <span className="text-neutral-300">→ {team.clubCode} {cents(t.price)}</span>{" "}
      {t.status === "open" ? (
        <span className="text-neutral-500">open</span>
      ) : (
        <span className={(t.pnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}>{money(t.pnl ?? 0)}</span>
      )}
    </span>
  );
}

/** What each paper account would buy if the game started now. */
function NextTrades({ items }: { items: Prediction[] }) {
  const priced = items.filter((p) => p.market);
  if (priced.length === 0) return null;
  const signal = (prob: number | undefined, p: Prediction) => {
    if (prob === undefined) return <span className="text-neutral-600">–</span>;
    const price = p.market!.homePrice;
    if (prob === price) return <span className="text-neutral-500">{pct(prob)} no trade</span>;
    return (
      <span>
        <span className="text-neutral-500">{pct(prob)} </span>
        <span className="text-neutral-300">→ {(prob > price ? p.home : p.away).clubCode}</span>
      </span>
    );
  };
  return (
    <div className="grid gap-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Next trades, at today&apos;s prices</h3>
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-3 py-2">Game</th>
              <th className="px-3 py-2 text-right">Polymarket, home</th>
              <th className="px-3 py-2">Eurostepper</th>
              <th className="px-3 py-2">Jev AI</th>
              <th className="px-3 py-2">When (UTC)</th>
            </tr>
          </thead>
          <tbody>
            {priced.map((p) => {
              const m = p.market!;
              const spread = m.bid !== null && m.ask !== null ? m.ask - m.bid : null;
              return (
                <tr key={p.gameCode} className="border-t border-neutral-800/60">
                  <td className="px-3 py-2">
                    <Link href={`/games/${p.gameCode}`} className="hover:text-orange-400">{p.home.clubCode} v {p.away.clubCode}</Link>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-300">
                    {pct(m.homePrice)}
                    {spread !== null && spread > 0.1 + 1e-9 && (
                      <span className="ml-1.5 text-xs text-amber-300" title="Too thin to trade unless the spread narrows before tip-off">
                        spread {cents(spread)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{signal(p.homeWinProb, p)}</td>
                  <td className="px-3 py-2 tabular-nums">{signal(p.ai?.homeWinProb, p)}</td>
                  <td className="px-3 py-2 text-xs text-neutral-500">{when(p.utcDate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PaperTradingPanel({ data }: { data: PredictionsOverview }) {
  const paper = data.market.paper;
  return (
    <div className="grid gap-4">
      <p className="text-sm text-neutral-400">
        Each model trades a paper account on Polymarket&apos;s prices. At tip-off, if the model gives the home
        team a higher chance than the market&apos;s price it buys {paper.shares} home shares; if lower, {paper.shares} away
        shares. A share pays $1 if its team wins, so buying at 77¢ makes 23¢ a share when right and loses
        77¢ when wrong.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {paper.strategies.map((s) => <StrategyCard key={s.key} s={s} />)}
      </div>
      {paper.series.length >= 2 && <PnlChart series={paper.series} />}
      {paper.games.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
              <tr>
                <th className="px-3 py-2">Game</th>
                <th className="px-3 py-2 text-right">Polymarket, home</th>
                <th className="px-3 py-2">Eurostepper</th>
                <th className="px-3 py-2">Jev AI</th>
                <th className="px-3 py-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {paper.games.map((g) => (
                <tr key={g.gameCode} className="border-t border-neutral-800/60">
                  <td className="px-3 py-2">
                    <Link href={`/games/${g.gameCode}`} className="hover:text-orange-400">{g.home.clubCode} v {g.away.clubCode}</Link>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-300" title={`Last price before tip-off, saved ${utcTime(g.pricedAt)} UTC`}>
                    {pct(g.marketHomePrice)}
                  </td>
                  <td className="px-3 py-2 tabular-nums"><TradeCell t={g.trades.eurostepper} g={g} /></td>
                  <td className="px-3 py-2 tabular-nums"><TradeCell t={g.trades.jev} g={g} /></td>
                  <td className="px-3 py-2 tabular-nums text-neutral-400">
                    {g.result ? `${g.result.homeScore}–${g.result.awayScore}` : "in play"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <NextTrades items={data.upcoming} />
      <p className="text-xs text-neutral-500">
        Simulated trades: no money is staked, and this is not betting advice. Percentages are each side&apos;s
        home win chance. Trades use the last price saved before tip-off, filled at what the order book
        charged for {`${paper.shares} shares`} then, plus Polymarket&apos;s taker fee (5% × price × (1 − price) a
        share). A game is skipped if the market&apos;s spread is wider than 10¢ or {`${paper.shares} shares`} can&apos;t
        be bought within 5¢ of the best price.
      </p>
    </div>
  );
}
