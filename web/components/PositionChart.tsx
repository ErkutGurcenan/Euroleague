"use client";

import { useState } from "react";
import type { StandingsHistoryClub } from "@/lib/api";

const COLORS = [
  "#f97316", "#10b981", "#3b82f6", "#e879f9",
  "#f43f5e", "#eab308", "#22d3ee", "#a3e635",
];

const W = 760;
const H = 400;
const PAD = { left: 30, right: 10, top: 10, bottom: 24 };

export default function PositionChart({
  clubs,
}: {
  clubs: StandingsHistoryClub[];
}) {
  const maxRound = Math.max(
    1,
    ...clubs.flatMap((c) => c.rounds.map((r) => r.round)),
  );
  const teams = clubs.length;
  const finalPos = (c: StandingsHistoryClub) =>
    c.rounds[c.rounds.length - 1]?.position ?? teams;
  const sorted = [...clubs].sort((a, b) => finalPos(a) - finalPos(b));

  const [selected, setSelected] = useState<string[]>(
    sorted.slice(0, 3).map((c) => c.club.code),
  );

  const toggle = (code: string) =>
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );

  const x = (round: number) =>
    PAD.left + ((round - 1) / (maxRound - 1)) * (W - PAD.left - PAD.right);
  const y = (pos: number) =>
    PAD.top + ((pos - 1) / (teams - 1)) * (H - PAD.top - PAD.bottom);

  const line = (c: StandingsHistoryClub) =>
    c.rounds
      .filter((r) => r.position !== null)
      .map((r) => `${x(r.round).toFixed(1)},${y(r.position!).toFixed(1)}`)
      .join(" ");

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {sorted.map((c) => {
          const idx = selected.indexOf(c.club.code);
          return (
            <button
              key={c.club.code}
              onClick={() => toggle(c.club.code)}
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors ${
                idx >= 0
                  ? "bg-neutral-800 text-white"
                  : "bg-neutral-900 text-neutral-500 hover:bg-neutral-800/60"
              }`}
              style={
                idx >= 0
                  ? { boxShadow: `inset 0 -2px 0 ${COLORS[idx % COLORS.length]}` }
                  : undefined
              }
            >
              {c.club.crestUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.club.crestUrl}
                  alt=""
                  className="h-3.5 w-3.5 object-contain"
                />
              )}
              {c.club.code}
            </button>
          );
        })}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-lg border border-neutral-800 bg-neutral-900/40"
        role="img"
        aria-label="League position by round"
      >
        {[1, 5, 10, 15, 20].filter((p) => p <= teams).map((p) => (
          <g key={p}>
            <line
              x1={PAD.left}
              y1={y(p)}
              x2={W - PAD.right}
              y2={y(p)}
              stroke="#262626"
              strokeWidth="1"
            />
            <text x={4} y={y(p) + 4} fontSize="11" fill="#737373">
              {p}
            </text>
          </g>
        ))}
        {Array.from({ length: Math.floor(maxRound / 5) }, (_, i) => (i + 1) * 5).map(
          (r) => (
            <text
              key={r}
              x={x(r)}
              y={H - 6}
              fontSize="11"
              fill="#737373"
              textAnchor="middle"
            >
              R{r}
            </text>
          ),
        )}
        {sorted
          .filter((c) => !selected.includes(c.club.code))
          .map((c) => (
            <polyline
              key={c.club.code}
              points={line(c)}
              fill="none"
              stroke="#3f3f46"
              strokeWidth="1.5"
            />
          ))}
        {selected.map((code) => {
          const c = sorted.find((cl) => cl.club.code === code);
          if (!c) return null;
          const idx = selected.indexOf(code);
          return (
            <polyline
              key={code}
              points={line(c)}
              fill="none"
              stroke={COLORS[idx % COLORS.length]}
              strokeWidth="3"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
      <p className="mt-2 text-xs text-neutral-500">
        League position after each round — click teams to highlight.
      </p>
    </div>
  );
}
