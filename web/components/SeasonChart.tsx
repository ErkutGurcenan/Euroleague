"use client";

import { useRef, useState } from "react";
import type { TrendPoint } from "@/lib/api";

type Key = "accuracy" | "jevAccuracy" | "marketAccuracy";

/** Colour, marker shape and line style each tell the three apart (checked for
    colour-blind readers on the dark background). Ours is drawn last, on top. */
const LINES: { key: Key; label: string; color: string; width: number; dash?: string; marker: string }[] = [
  { key: "marketAccuracy", label: "Polymarket favourite", color: "#737373", width: 1.5, dash: "4 3", marker: "rotate-45 rounded-[1px]" },
  { key: "jevAccuracy", label: "Jev AI", color: "#38bdf8", width: 1.5, marker: "rounded-[1px]" },
  { key: "accuracy", label: "Eurostepper", color: "#fb923c", width: 2, marker: "rounded-full" },
];
const LISTED = [...LINES].reverse();

function share(v: number | null): string {
  return v === null ? "–" : `${Math.round(v * 100)}%`;
}

function Swatch({ line }: { line: (typeof LINES)[number] }) {
  return (
    <svg width="16" height="8" aria-hidden="true" className="shrink-0">
      <line x1="0" x2="16" y1="4" y2="4" stroke={line.color} strokeWidth="2" strokeDasharray={line.dash} />
    </svg>
  );
}

/** Share of winners picked after each round: ours, Jev's and the market
    favourite's. A dot marks every round; pointing at one (or tapping it) shows
    that round's numbers. Lines stretch to the width while the text keeps its
    size, so it reads the same on a phone and a wide screen. */
export default function SeasonChart({ trend }: { trend: TrendPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const pointer = useRef("");
  const all = trend.flatMap((p) => LINES.map((l) => p[l.key])).filter((v): v is number => v !== null);
  const lo = Math.max(0, Math.floor((Math.min(...all) * 100 - 3) / 10) * 10);
  const hi = Math.min(100, Math.ceil((Math.max(...all) * 100 + 3) / 10) * 10);
  const ticks = Array.from({ length: (hi - lo) / 10 + 1 }, (_, i) => lo + i * 10);
  const x = (i: number) => (trend.length === 1 ? 50 : (i / (trend.length - 1)) * 100);
  const y = (v: number) => (1 - (v * 100 - lo) / (hi - lo)) * 100;
  const points = (k: Key) =>
    trend.flatMap((p, i) => (p[k] === null ? [] : [`${x(i).toFixed(2)},${y(p[k]).toFixed(2)}`])).join(" ");
  const name = (p: TrendPoint) => p.roundName ?? `Round ${p.round}`;
  const last = trend[trend.length - 1];
  // At most about eight round labels, counted back from the latest so it's always shown.
  const step = Math.ceil(trend.length / 8);
  const half = trend.length === 1 ? 50 : 50 / (trend.length - 1);
  const shown = active === null ? null : trend[active];
  return (
    <div className="grid gap-2 rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
        {LISTED.map((l) => (
          <span key={l.key} className="flex items-center gap-1.5">
            <Swatch line={l} />
            {l.label} {share(last[l.key])}
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="relative w-8 shrink-0 text-right text-[11px] tabular-nums text-neutral-500" aria-hidden="true">
          {ticks.map((v) => (
            <span key={v} className="absolute right-0 -translate-y-1/2" style={{ top: `${y(v / 100)}%` }}>{v}%</span>
          ))}
        </div>
        <div
          className="relative h-44 flex-1"
          onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
        >
          {ticks.map((v) => (
            <div key={v} className="absolute inset-x-0 border-t border-neutral-800" style={{ top: `${y(v / 100)}%` }} />
          ))}
          {active !== null && (
            <div className="absolute inset-y-0 w-px bg-neutral-600" style={{ left: `${x(active)}%` }} />
          )}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            {trend.length > 1 && <polygon points={`0,100 ${points("accuracy")} 100,100`} fill="#fb923c" fillOpacity="0.1" />}
            {LINES.map((l) => (
              <polyline
                key={l.key} points={points(l.key)} fill="none" stroke={l.color} strokeWidth={l.width}
                strokeDasharray={l.dash} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          {LINES.map((l) =>
            trend.map((p, i) => {
              const v = p[l.key];
              if (v === null) return null;
              const big = i === active;
              return (
                <span
                  key={`${l.key}${p.round}`}
                  aria-hidden="true"
                  className={`absolute -translate-x-1/2 -translate-y-1/2 ring-2 ring-neutral-950 ${l.marker} ${big ? "size-3" : "size-2"}`}
                  style={{ left: `${x(i)}%`, top: `${y(v)}%`, background: l.color }}
                />
              );
            }),
          )}
          {trend.map((p, i) => {
            const from = Math.max(0, x(i) - half);
            const width = Math.min(100, x(i) + half) - from;
            return (
              <button
                key={p.round}
                type="button"
                className="absolute inset-y-0 cursor-default focus:outline-none focus-visible:bg-white/5"
                style={{ left: `${from}%`, width: `${width}%` }}
                aria-label={`After ${name(p)}, ${p.games} games: ${LISTED.map((l) => `${l.label} ${share(p[l.key])}`).join(", ")}`}
                onPointerDown={(e) => {
                  pointer.current = e.pointerType;
                }}
                onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
                // A mouse click keeps it open (hovering opened it); a tap toggles it.
                onClick={() => {
                  setActive((a) => (pointer.current === "mouse" || a !== i ? i : null));
                  pointer.current = "";
                }}
                onFocus={(e) => e.currentTarget.matches(":focus-visible") && setActive(i)}
                onBlur={() => setActive(null)}
              />
            );
          })}
          {shown && active !== null && (
            <div
              className="pointer-events-none absolute top-1 z-10 w-max rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-2 text-xs shadow-lg"
              style={x(active) < 55 ? { left: `calc(${x(active)}% + 12px)` } : { right: `calc(${100 - x(active)}% + 12px)` }}
            >
              <div className="mb-1 font-semibold text-neutral-100">
                After {name(shown)} <span className="font-normal text-neutral-500">· {shown.games} games</span>
              </div>
              {LISTED.map((l) => (
                <div key={l.key} className="flex items-center gap-2 text-neutral-300">
                  <span className={`size-2 shrink-0 ${l.marker}`} style={{ background: l.color }} />
                  {l.label}
                  <span className="ml-auto pl-4 font-semibold tabular-nums text-neutral-100">{share(shown[l.key])}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="relative ml-10 h-4 text-[11px] text-neutral-500" aria-hidden="true">
        {trend.map((p, i) =>
          (trend.length - 1 - i) % step === 0 ? (
            <span
              key={p.round}
              className="absolute"
              style={{
                left: `${x(i)}%`,
                transform: trend.length === 1 ? "translateX(-50%)" : i === 0 ? undefined : i === trend.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              R{p.round}
            </span>
          ) : null,
        )}
      </div>
      <p className="text-xs text-neutral-500">Share of winners picked so far, after each round. Point at a round, or tap it, to see all three.</p>
    </div>
  );
}
