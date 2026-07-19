"use client";

import { useMemo, useState } from "react";
import ShotChart from "@/components/ShotChart";
import ZoneChart from "@/components/ZoneChart";
import type { ShotPoint } from "@/lib/api";

type Result = "all" | "made" | "missed";
type Kind = "all" | "2" | "3";
type Venue = "all" | "home" | "away";
type Outcome = "all" | "wins" | "losses";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-2.5 py-1 text-xs transition-colors ${
        active
          ? "bg-orange-600 text-white"
          : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
      }`}
    >
      {children}
    </button>
  );
}

export default function ShotChartExplorer({ shots }: { shots: ShotPoint[] }) {
  const [result, setResult] = useState<Result>("all");
  const [kind, setKind] = useState<Kind>("all");
  const [venue, setVenue] = useState<Venue>("all");
  const [outcome, setOutcome] = useState<Outcome>("all");
  const [fastbreak, setFastbreak] = useState(false);

  const filtered = useMemo(
    () =>
      shots.filter(
        (s) =>
          (result === "all" || (result === "made") === s.made) &&
          (kind === "all" || (kind === "3") === s.three) &&
          (venue === "all" || (venue === "home") === s.home) &&
          (outcome === "all" || (outcome === "wins") === s.won) &&
          (!fastbreak || s.fastbreak),
      ),
    [shots, result, kind, venue, outcome, fastbreak],
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {(["all", "made", "missed"] as const).map((r) => (
          <Chip key={r} active={result === r} onClick={() => setResult(r)}>
            {r === "all" ? "All shots" : r === "made" ? "Made" : "Missed"}
          </Chip>
        ))}
        <span className="mx-1 h-4 w-px bg-neutral-700" />
        {(["all", "2", "3"] as const).map((k) => (
          <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
            {k === "all" ? "2P + 3P" : `${k}P only`}
          </Chip>
        ))}
        <span className="mx-1 h-4 w-px bg-neutral-700" />
        {(["all", "home", "away"] as const).map((v) => (
          <Chip key={v} active={venue === v} onClick={() => setVenue(v)}>
            {v === "all" ? "Home + away" : v === "home" ? "Home" : "Away"}
          </Chip>
        ))}
        <span className="mx-1 h-4 w-px bg-neutral-700" />
        {(["all", "wins", "losses"] as const).map((o) => (
          <Chip key={o} active={outcome === o} onClick={() => setOutcome(o)}>
            {o === "all" ? "W + L" : o === "wins" ? "Wins" : "Losses"}
          </Chip>
        ))}
        <span className="mx-1 h-4 w-px bg-neutral-700" />
        <Chip active={fastbreak} onClick={() => setFastbreak(!fastbreak)}>
          Fastbreak only
        </Chip>
        <span className="ml-auto text-xs text-neutral-500">
          {filtered.length} shots
        </span>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-medium uppercase text-neutral-400">
            Shot chart
          </h3>
          <ShotChart shots={filtered} />
        </div>
        <div>
          <h3 className="mb-3 text-sm font-medium uppercase text-neutral-400">
            Hot zones
          </h3>
          <ZoneChart shots={filtered} />
        </div>
      </div>
    </div>
  );
}
