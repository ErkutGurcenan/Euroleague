import Link from "next/link";
import type { AdjustedImpact, PlayerImpactData } from "@/lib/api";

export const ADJUSTED_NOTE =
  "Adjusted impact estimates the points per 100 possessions a player adds compared with an average EuroLeague player, after accounting for every teammate and opponent he shared the court with. It is fitted on every stint of the season, starting from his earlier seasons, and the range shows how sure the estimate is (90%).";

function signed(n: number): string {
  const r = Math.round(n * 10) / 10;
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r).toFixed(1)}`;
}

function tone(n: number): string {
  const r = Math.round(n * 10) / 10;
  return r > 0 ? "text-emerald-400" : r < 0 ? "text-red-400" : "text-neutral-300";
}

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${s}`;
}

/** Estimate with its 90% range on a shared scale around zero. */
function RangeBar({ value, range, scale }: { value: number; range: number; scale: number }) {
  const pos = (v: number) => `${50 + (Math.max(-scale, Math.min(scale, v)) / scale) * 50}%`;
  return (
    <span className="relative block h-3 w-40" title={`${signed(value)}, likely between ${signed(value - range)} and ${signed(value + range)}`}>
      <span className="absolute inset-y-[-3px] left-1/2 w-px bg-neutral-700" />
      <span
        className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded bg-neutral-500"
        style={{ left: pos(value - range), width: `calc(${pos(value + range)} - ${pos(value - range)})` }}
      />
      <span
        className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${value >= 0 ? "bg-emerald-400" : "bg-red-400"}`}
        style={{ left: pos(value) }}
      />
    </span>
  );
}

export function AdjustedLeaderboard({ data, limit = 50 }: { data: AdjustedImpact; limit?: number }) {
  const rows = data.players.slice(0, limit);
  const scale = 8;
  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-2 py-2 text-right">Min</th>
              <th className="px-2 py-2 text-right">Offence</th>
              <th className="px-2 py-2 text-right">Defence</th>
              <th className="px-2 py-2 text-right">Total</th>
              <th className="px-3 py-2">Range</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-center text-neutral-500">No player has {data.minMinutes}+ minutes yet.</td>
              </tr>
            )}
            {rows.map((p) => (
              <tr key={p.playerCode} className="border-t border-neutral-800/60 hover:bg-neutral-900/60">
                <td className="px-3 py-2 text-neutral-500">{p.rank}</td>
                <td className="px-3 py-2">
                  <Link href={`/players/${p.playerCode}`} className="hover:text-orange-400">
                    {p.name}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/teams/${p.clubCode}`} className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-white" title={p.clubName}>
                    {p.clubCrest && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.clubCrest} alt="" className="h-4 w-4 object-contain" />
                    )}
                    {p.clubCode}
                  </Link>
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-neutral-400">{p.minutes.toFixed(0)}</td>
                <td className={`px-2 py-2 text-right tabular-nums ${tone(p.off)}`}>{signed(p.off)}</td>
                <td className={`px-2 py-2 text-right tabular-nums ${tone(p.def)}`}>{signed(p.def)}</td>
                <td className={`px-2 py-2 text-right font-semibold tabular-nums ${tone(p.total)}`}>{signed(p.total)}</td>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2">
                    <RangeBar value={p.total} range={p.totalRange} scale={scale} />
                    <span className="text-xs tabular-nums text-neutral-500">±{p.totalRange.toFixed(1)}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-500">
        {ADJUSTED_NOTE} Players need {data.minMinutes}+ minutes to be listed
        {data.players.length > rows.length ? `; showing the top ${rows.length} of ${data.players.length}` : ""}.
        {data.homeEdge !== null && ` Home teams score about ${data.homeEdge.toFixed(1)} more points per 100 possessions this season.`}
      </p>
    </div>
  );
}

function Tile({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border bg-neutral-900/40 px-4 py-3 text-center ${highlight ? "border-orange-600/60" : "border-neutral-800"}`}>
      <div className="text-xs uppercase text-neutral-500">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${highlight ? "text-orange-400" : ""}`}>{value}</div>
      <div className="text-xs text-neutral-500">{sub}</div>
    </div>
  );
}

export function PlayerAdjusted({ data }: { data: PlayerImpactData }) {
  const c = data.current;
  return (
    <div className="grid gap-3">
      {c && (
        <>
          <div className="grid max-w-2xl grid-cols-3 gap-3">
            <Tile
              label="Adjusted impact"
              value={signed(c.total)}
              sub={c.rank ? `${ordinal(c.rank)} of ${c.qualified} in the league` : `needs ${c.minMinutes}+ min to rank`}
              highlight
            />
            <Tile label="Offence" value={signed(c.off)} sub={`±${c.offRange.toFixed(1)}`} />
            <Tile label="Defence" value={signed(c.def)} sub={`±${c.defRange.toFixed(1)}`} />
          </div>
          <p className="max-w-2xl text-sm text-neutral-400">
            About {Math.abs(c.total).toFixed(1)} points per 100 possessions {c.total >= 0 ? "better" : "worse"} than an
            average player, likely between {signed(c.total - c.totalRange)} and {signed(c.total + c.totalRange)}.
          </p>
        </>
      )}
      {data.history.length > 1 && (
        <div className="max-w-2xl overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
              <tr>
                <th className="px-3 py-2">Season</th>
                <th className="px-3 py-2">Team</th>
                <th className="px-2 py-2 text-right">Min</th>
                <th className="px-2 py-2 text-right">Off</th>
                <th className="px-2 py-2 text-right">Def</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.history.map((h) => (
                <tr key={h.season} className={`border-t border-neutral-800/60 ${h.season === data.season ? "bg-neutral-900/60" : ""}`}>
                  <td className="px-3 py-1.5 text-neutral-300">{h.seasonLabel}</td>
                  <td className="px-3 py-1.5">
                    <span className="inline-flex items-center gap-1.5 text-neutral-400">
                      {h.clubCrest && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={h.clubCrest} alt="" className="h-4 w-4 object-contain" />
                      )}
                      {h.clubCode}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-neutral-400">{h.minutes.toFixed(0)}</td>
                  <td className={`px-2 py-1.5 text-right tabular-nums ${tone(h.off)}`}>{signed(h.off)}</td>
                  <td className={`px-2 py-1.5 text-right tabular-nums ${tone(h.def)}`}>{signed(h.def)}</td>
                  <td className={`px-3 py-1.5 text-right font-semibold tabular-nums ${tone(h.total)}`}>
                    {signed(h.total)} <span className="text-xs font-normal text-neutral-500">±{h.totalRange.toFixed(1)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="max-w-2xl text-xs text-neutral-500">{ADJUSTED_NOTE}</p>
    </div>
  );
}
