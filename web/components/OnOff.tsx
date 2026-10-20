import Link from "next/link";
import type { ClubOnOff, PlayerOnOffEntry } from "@/lib/api";

export const ONOFF_NOTE =
  "On/off compares how the team did per 100 possessions with the player on the court and on the bench, in games he played. It depends on teammates and opponents: starters often face the other team's best players, and a strong bench lifts the off-court numbers.";

function signed(n: number | null): string {
  if (n === null) return "–";
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}`;
}

function tone(n: number | null): string {
  return n === null ? "text-neutral-500" : n > 0 ? "text-emerald-400" : n < 0 ? "text-red-400" : "text-neutral-300";
}

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${s}`;
}

/** Team page: players ranked by on/off swing, with a diverging bar. */
export function OnOffRanking({ data }: { data: ClubOnOff }) {
  const ranked = data.players.filter((p) => p.rank !== undefined);
  const unranked = data.players.length - ranked.length;
  const scale = Math.max(10, ...ranked.map((p) => Math.abs(p.swing ?? 0)));
  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Player</th>
              <th className="px-2 py-2 text-right">On min</th>
              <th className="px-2 py-2 text-right">Net on</th>
              <th className="px-2 py-2 text-right">Net off</th>
              <th className="px-3 py-2">Swing</th>
            </tr>
          </thead>
          <tbody>
            {ranked.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-neutral-500">
                  No player has enough minutes on and off the court yet.
                </td>
              </tr>
            )}
            {ranked.map((p) => {
              const w = (Math.min(Math.abs(p.swing ?? 0), scale) / scale) * 50;
              return (
                <tr key={p.playerCode} className="border-t border-neutral-800/60 hover:bg-neutral-900/60">
                  <td className="px-3 py-2 text-neutral-500">{p.rank}</td>
                  <td className="px-3 py-2">
                    <Link href={`/players/${p.playerCode}`} className="hover:text-orange-400">
                      {p.name}
                    </Link>
                    {p.smallSample && (
                      <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10.5px] text-amber-300">small sample</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-neutral-400">{p.on.minutes.toFixed(0)}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${tone(p.on.netRating)}`}>{signed(p.on.netRating)}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${tone(p.off.netRating)}`}>{signed(p.off.netRating)}</td>
                  <td className="px-3 py-2">
                    <span className="flex min-w-[11rem] items-center gap-2">
                      <span className="relative block h-3 flex-1">
                        <span className="absolute inset-y-[-3px] left-1/2 w-px bg-neutral-700" />
                        <span
                          className={`absolute inset-y-0.5 rounded-sm ${(p.swing ?? 0) >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                          style={(p.swing ?? 0) >= 0 ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }}
                        />
                      </span>
                      <span className={`w-12 text-right font-semibold tabular-nums ${tone(p.swing)}`}>{signed(p.swing)}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-500">
        {ONOFF_NOTE} Ranked players need {data.minOnMinutes}+ minutes on and {data.minOffMinutes}+ off
        {unranked > 0 ? `; ${unranked} below that aren't ranked` : ""}.
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

/** Player page: on/off tiles for each club he played for this season. */
export function PlayerImpact({ entries }: { entries: PlayerOnOffEntry[] }) {
  return (
    <div className="grid gap-4">
      {entries.map((e) => (
        <div key={e.club} className="grid gap-3">
          {entries.length > 1 && (
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              {e.clubCrest && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.clubCrest} alt="" className="h-4 w-4 object-contain" />
              )}
              {e.clubName}
            </div>
          )}
          <div className="grid max-w-2xl grid-cols-3 gap-3">
            <Tile label="On court" value={signed(e.on.netRating)} sub={`${e.on.minutes.toFixed(0)} min`} />
            <Tile label="Off court" value={signed(e.off.netRating)} sub={`${e.off.minutes.toFixed(0)} min`} />
            <Tile label="Swing" value={signed(e.swing)} sub={e.rank ? `${ordinal(e.rank)} of ${e.qualifiedPlayers} on team` : "not ranked yet"} highlight />
          </div>
          <p className="max-w-2xl text-sm text-neutral-400">
            {e.swing === null
              ? "Not enough minutes yet."
              : `${e.clubName} were ${Math.abs(e.swing).toFixed(1)} points per 100 possessions ${e.swing >= 0 ? "better" : "worse"} with ${e.name} on the court than with him on the bench.`}
            {e.smallSample && " Small sample, so read with care."}
          </p>
        </div>
      ))}
      <p className="max-w-2xl text-xs text-neutral-500">{ONOFF_NOTE}</p>
    </div>
  );
}
