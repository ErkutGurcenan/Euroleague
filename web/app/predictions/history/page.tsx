export const metadata = { title: "Prediction history" };

import Link from "next/link";
import PredictionsToggle from "@/components/PredictionsToggle";
import { getPredictionHistory, type GradedCall, type HistoryGame, type Tally } from "@/lib/api";
import { currentSeason } from "@/lib/season";

const MODELS = [
  { key: "eurostepper", label: "Eurostepper", note: "our model", bar: "bg-orange-500" },
  { key: "jev", label: "Jev AI", note: "TypeSafe's decision model", bar: "bg-sky-400" },
  { key: "market", label: "Polymarket", note: "betting favourite, for reference", bar: "bg-neutral-400" },
] as const;

function pct(x: number | null): string {
  return x === null ? "–" : `${Math.round(x * 100)}%`;
}

function day(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

function SummaryCard({ label, note, bar, t }: { label: string; note: string; bar: string; t: Tally }) {
  const stats: [string, string][] = [["Correct", String(t.correct)], ["Total", String(t.total)], ["Success", pct(t.accuracy)]];
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">{label}</span>
        <span className="text-xs text-neutral-500">{note}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {stats.map(([k, v]) => (
          <div key={k}>
            <div className="text-xs uppercase text-neutral-500">{k}</div>
            <div className="text-2xl font-bold tabular-nums">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded bg-neutral-800">
        <div className={`h-full ${bar}`} style={{ width: `${(t.accuracy ?? 0) * 100}%` }} />
      </div>
    </div>
  );
}

function TallyCell({ t }: { t: Tally }) {
  if (!t.total) return <span className="text-neutral-600">–</span>;
  return (
    <span>
      <span className="text-neutral-300">{t.correct}/{t.total}</span>{" "}
      <span className="text-neutral-500">{pct(t.accuracy)}</span>
    </span>
  );
}

/** The team a call favoured, its chance, and whether it won. */
function CallCell({ c, g }: { c: GradedCall | null; g: HistoryGame }) {
  if (!c) return <span className="text-neutral-600">–</span>;
  if (c.correct === null) return <span className="text-neutral-400">50–50</span>;
  const homeFav = c.homeWinProb > 0.5;
  const team = homeFav ? g.home : g.away;
  return (
    <span
      className={c.correct ? "text-emerald-400" : "text-red-400"}
      title={c.pickedWinner ? "Asked to pick the winner (Jev's question before 22 October)" : undefined}
    >
      {team.clubCode} {pct(homeFav ? c.homeWinProb : 1 - c.homeWinProb)}
      {c.pickedWinner ? "*" : ""} {c.correct ? "✓" : "✗"}
    </span>
  );
}

export default async function PredictionHistoryPage() {
  const data = await getPredictionHistory(await currentSeason());
  const anyCalls = data.games.length > 0;
  const oldJevQuestion = data.games.some((g) => g.jev?.pickedWinner);
  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Predictions</h1>
          <PredictionsToggle active="history" />
        </div>
        <span className="text-sm text-neutral-400">Every pre-game call, graded after the game · {data.seasonLabel}</span>
      </div>

      {!anyCalls ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-400">
          {`No graded predictions for ${data.seasonLabel}. Our live predictions began with Round 7 of 2026-27: `
            + "each call is saved before tip-off and graded here after the game."}
        </p>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            {MODELS.map((m) => (
              <SummaryCard key={m.key} label={m.label} note={m.note} bar={m.bar} t={data.summary[m.key]} />
            ))}
          </section>

          <section className="grid gap-3">
            <h2 className="text-lg font-semibold">By round</h2>
            <div className="overflow-x-auto rounded-lg border border-neutral-800">
              <table className="w-full whitespace-nowrap text-sm">
                <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
                  <tr>
                    <th className="px-3 py-2">Round</th>
                    {MODELS.map((m) => <th key={m.key} className="px-3 py-2">{m.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.rounds.map((r) => (
                    <tr key={r.round} className="border-t border-neutral-800/60">
                      <td className="px-3 py-2 text-neutral-300">{r.roundName ?? `Round ${r.round}`}</td>
                      {MODELS.map((m) => <td key={m.key} className="px-3 py-2 tabular-nums"><TallyCell t={r[m.key]} /></td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-3">
            <h2 className="text-lg font-semibold">Game by game</h2>
            <div className="overflow-x-auto rounded-lg border border-neutral-800">
              <table className="w-full whitespace-nowrap text-sm">
                <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
                  <tr>
                    <th className="px-3 py-2">Game</th>
                    <th className="px-3 py-2">Result</th>
                    {MODELS.map((m) => <th key={m.key} className="px-3 py-2">{m.label}</th>)}
                    <th className="px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.games.map((g) => (
                    <tr key={g.gameCode} className="border-t border-neutral-800/60">
                      <td className="px-3 py-2">
                        <Link href={`/games/${g.gameCode}`} className="hover:text-orange-400">
                          {g.home.clubCode} v {g.away.clubCode}
                        </Link>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-neutral-400">{g.result.homeScore}–{g.result.awayScore}</td>
                      {MODELS.map((m) => (
                        <td key={m.key} className="px-3 py-2 tabular-nums"><CallCell c={g[m.key]} g={g} /></td>
                      ))}
                      <td className="px-3 py-2 text-xs text-neutral-500">{day(g.utcDate)} · {g.roundName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <p className="text-xs text-neutral-500">
        {"Only calls made before tip-off count. A call is correct when the team it gave more than 50% won; "
          + "a call of exactly 50% counts as no pick. Polymarket's favourite is the team its last price before "
          + "tip-off rated above 50%; it is shown for reference."
          + (oldJevQuestion ? " * Before 22 October Jev was asked to pick the winner, which gave near-certain answers." : "")}
      </p>
    </div>
  );
}
