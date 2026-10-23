import type { InjuryEntry } from "@/lib/api";

const STATUS_STYLES: Record<string, string> = {
  Out: "bg-red-500/15 text-red-400",
  Doubtful: "bg-orange-500/15 text-orange-400",
  Questionable: "bg-amber-500/15 text-amber-300",
  "Game-time": "bg-amber-500/15 text-amber-300",
  Uncertain: "bg-neutral-500/20 text-neutral-300",
  Expected: "bg-lime-500/15 text-lime-300",
  Ready: "bg-emerald-500/15 text-emerald-400",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status] ?? STATUS_STYLES.Uncertain
      }`}
    >
      {status}
    </span>
  );
}

/** Human-readable form of the report's round field: "4-8" -> "Through Round 8". */
export function timeline(rounds: string): string {
  if (rounds === "Season") return "Out for season";
  const range = rounds.match(/^(\d+)-(\d+)$/);
  if (range) return `Through Round ${range[2]}`;
  if (/^\d+$/.test(rounds)) return `Round ${rounds}`;
  return rounds;
}

export function isMedical(e: InjuryEntry): boolean {
  return (e.reason === "injury" || e.reason === "illness") && e.status !== "Ready";
}

/** Missing games or at risk of it: injured or ill, or ruled out for any
    other reason (a coach's decision, a suspension). */
export function isUnavailable(e: InjuryEntry): boolean {
  return isMedical(e) || e.status === "Out";
}

/** Whether a report entry still applies to a regular-season round: absences
    whose stated last round is before it are assumed over. */
export function appliesToRound(e: InjuryEntry, round: number | null): boolean {
  if (round === null) return true;
  const last = e.rounds.match(/^(?:\d+-)?(\d+)$/);
  return !last || round <= Number(last[1]);
}
