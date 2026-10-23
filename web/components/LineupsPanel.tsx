"use client";

import Link from "next/link";
import { useState } from "react";
import type { ClubLineups, LineupRow } from "@/lib/api";

type LineupsData = {
  games: number;
  team?: ClubLineups["team"];
  sizes: Record<"5" | "3" | "2", { minMinutes: number; rows: LineupRow[] }>;
};

const SIZES = [
  { key: "5", label: "5-man" },
  { key: "3", label: "3-man" },
  { key: "2", label: "2-man" },
] as const;

function signed(n: number | null): string {
  if (n === null) return "–";
  const r = Math.round(n * 10) / 10;
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r).toFixed(1)}`;
}

function netClass(n: number | null): string {
  return n === null ? "text-neutral-500" : n > 0 ? "text-emerald-400" : n < 0 ? "text-red-400" : "text-neutral-300";
}

export default function LineupsPanel({ data }: { data: LineupsData }) {
  const [size, setSize] = useState<"5" | "3" | "2">("5");
  const [sort, setSort] = useState<"minutes" | "net">("minutes");
  const block = data.sizes[size];
  const rows: LineupRow[] = (
    sort === "minutes"
      ? block.rows
      : [...block.rows].sort((a, b) => (b.netRating ?? -999) - (a.netRating ?? -999))
  ).slice(0, 25);
  const league = rows.some((r) => r.clubCode);
  const toggle = (active: boolean) =>
    `px-3 py-1 text-xs transition-colors ${active ? "bg-orange-600 text-white" : "text-neutral-400 hover:text-white"}`;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex shrink-0 overflow-hidden rounded-md border border-neutral-700" role="group" aria-label="Lineup size">
          {SIZES.map((s) => (
            <button key={s.key} type="button" aria-pressed={size === s.key} onClick={() => setSize(s.key)} className={toggle(size === s.key)}>
              {s.label}
            </button>
          ))}
        </span>
        <span className="flex shrink-0 overflow-hidden rounded-md border border-neutral-700" role="group" aria-label="Sort lineups">
          <button type="button" aria-pressed={sort === "minutes"} onClick={() => setSort("minutes")} className={toggle(sort === "minutes")}>
            Most used
          </button>
          <button type="button" aria-pressed={sort === "net"} onClick={() => setSort("net")} className={toggle(sort === "net")}>
            Best
          </button>
        </span>
        <span className="ml-auto text-xs text-neutral-500">
          min. {block.minMinutes} minutes together · {data.games} games{league ? " · all teams" : ""}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-3 py-2">Lineup</th>
              <th className="px-2 py-2 text-right">Min</th>
              <th className="px-2 py-2 text-right">Poss</th>
              <th className="px-2 py-2 text-right">Off</th>
              <th className="px-2 py-2 text-right">Def</th>
              <th className="px-3 py-2 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {data.team && (
              <tr className="border-t border-neutral-800/60 bg-neutral-900/50 text-neutral-400">
                <td className="px-3 py-2 italic">Whole team</td>
                <td className="px-2 py-2 text-right tabular-nums">{data.team.minutes}</td>
                <td className="px-2 py-2 text-right">–</td>
                <td className="px-2 py-2 text-right tabular-nums">{data.team.offRating?.toFixed(1) ?? "–"}</td>
                <td className="px-2 py-2 text-right tabular-nums">{data.team.defRating?.toFixed(1) ?? "–"}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${netClass(data.team.netRating)}`}>{signed(data.team.netRating)}</td>
              </tr>
            )}
            {rows.length === 0 && (
              <tr className="border-t border-neutral-800/60">
                <td colSpan={6} className="px-3 py-4 text-center text-neutral-500">
                  No {size}-player combination has {block.minMinutes}+ minutes together yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={`${r.clubCode ?? ""}:${r.players.map((p) => p.playerCode).join("|")}`} className="border-t border-neutral-800/60 hover:bg-neutral-900/60">
                <td className="px-3 py-2">
                  <span className="inline-flex flex-wrap items-center gap-x-1">
                    {r.clubCode && (
                      <Link href={`/teams/${r.clubCode}`} className="mr-1.5 inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-white" title={r.clubName}>
                        {r.clubCrest && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.clubCrest} alt="" className="h-4 w-4 object-contain" />
                        )}
                        {r.clubCode}
                      </Link>
                    )}
                    {r.players.map((p, i) => (
                      <span key={p.playerCode}>
                        <Link href={`/players/${p.playerCode}`} className="hover:text-orange-400">
                          {p.name}
                        </Link>
                        {i < r.players.length - 1 && <span className="text-neutral-600"> · </span>}
                      </span>
                    ))}
                    {r.smallSample && (
                      <span className="ml-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10.5px] text-amber-300">small sample</span>
                    )}
                  </span>
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-neutral-300">{r.minutes.toFixed(0)}</td>
                <td className="px-2 py-2 text-right tabular-nums text-neutral-400">{r.possessions}</td>
                <td className="px-2 py-2 text-right tabular-nums text-neutral-300">{r.offRating?.toFixed(1) ?? "–"}</td>
                <td className="px-2 py-2 text-right tabular-nums text-neutral-300">{r.defRating?.toFixed(1) ?? "–"}</td>
                <td className={`px-3 py-2 text-right font-semibold tabular-nums ${netClass(r.netRating)}`}>{signed(r.netRating)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-500">
        Off and Def are points scored and allowed per 100 possessions while the group was on court;
        Net is the difference. Possessions are estimated from the play-by-play.
        {data.team ? " Compare each group with the whole-team row." : " League average net rating is 0."}{" "}
        Groups with under {2 * block.minMinutes} minutes are marked as small samples.
      </p>
    </div>
  );
}
