import Link from "next/link";
import type { Rotation, RotationTeam } from "@/lib/api";

type Available = Extract<Rotation, { available: true }>;

/** "Q2 7:13" style game clock for a second since tip-off. */
function clock(sec: number): string {
  const period = sec < 2400 ? Math.min(4, Math.floor(sec / 600) + 1) : 5 + Math.floor((sec - 2400) / 300);
  const periodStart = period <= 4 ? (period - 1) * 600 : 2400 + (period - 5) * 300;
  const periodLength = period <= 4 ? 600 : 300;
  const left = periodLength - (sec - periodStart);
  const label = period <= 4 ? `Q${period}` : period === 5 ? "OT" : `OT${period - 4}`;
  return `${label} ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0";
}

function TeamRotation({
  team,
  rotation,
  sign,
}: {
  team: RotationTeam;
  rotation: Available;
  sign: 1 | -1;
}) {
  const pct = (s: number) => `${(s / rotation.length) * 100}%`;
  const minutes = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase text-neutral-400">
        {team.crestUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.crestUrl} alt="" className="h-5 w-5 object-contain" />
        )}
        {team.name}
      </h3>
      <div className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_2.75rem] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_3rem]">
        <span className="text-[11px] uppercase text-neutral-600">Player</span>
        <span className="relative h-4 text-[11px] text-neutral-600">
          {["Q1", "Q2", "Q3", "Q4"].map((q, i) => (
            <span key={q} className="absolute" style={{ left: pct(i * 600) }}>
              {q}
            </span>
          ))}
          {rotation.periods
            .filter((p) => p >= 2400)
            .map((p, i) => (
              <span key={p} className="absolute" style={{ left: pct(p) }}>
                {i === 0 ? "OT" : `OT${i + 1}`}
              </span>
            ))}
        </span>
        <span className="text-right text-[11px] uppercase text-neutral-600">+/−</span>

        {team.players.map((p) => (
          <div key={p.playerCode} className="contents">
            <Link
              href={`/players/${p.playerCode}`}
              className={`truncate text-xs hover:text-orange-400 ${p.starter ? "text-neutral-100" : "text-neutral-400"}`}
              title={`${p.name} · ${minutes(p.seconds)} on court`}
            >
              {p.name}
            </Link>
            <div className="relative h-3.5 rounded-sm bg-neutral-800/60">
              {rotation.periods.map((t) => (
                <span key={t} className="absolute inset-y-[-3px] w-px bg-neutral-700" style={{ left: pct(t) }} />
              ))}
              {p.segments.map(([a, b]) => (
                <span
                  key={a}
                  className="absolute inset-y-0.5 rounded-[2px] bg-orange-600"
                  style={{ left: pct(a), width: pct(b - a) }}
                  title={`${clock(a)} – ${clock(b)}`}
                />
              ))}
            </div>
            <span
              className={`text-right text-xs tabular-nums ${
                p.plusMinus > 0 ? "text-emerald-400" : p.plusMinus < 0 ? "text-red-400" : "text-neutral-400"
              }`}
            >
              {signed(p.plusMinus)}
            </span>
          </div>
        ))}

        <span className="pt-2 text-[11px] text-neutral-500">Score change</span>
        <div className="flex h-5 gap-px overflow-hidden rounded-sm pt-0">
          {rotation.stints.map((s) => {
            const net = sign * s.homeNet;
            return (
              <span
                key={s.start}
                className={`block h-full ${net > 0 ? "bg-emerald-700" : net < 0 ? "bg-red-900" : "bg-neutral-700"}`}
                style={{ flexGrow: s.end - s.start, flexBasis: 0 }}
                title={`${clock(s.start)} – ${clock(s.end)}: ${signed(net)}`}
              />
            );
          })}
        </div>
        <span />
      </div>
    </div>
  );
}

export default function RotationChart({ rotation }: { rotation: Rotation }) {
  if (!rotation.available) return null;
  if (!rotation.usable) {
    return (
      <p className="mb-8 text-sm text-neutral-500">
        Rotation not shown: the substitution record for this game is incomplete.
      </p>
    );
  }
  return (
    <div className="mb-8 grid gap-4">
      <TeamRotation team={rotation.home} rotation={rotation} sign={1} />
      <TeamRotation team={rotation.away} rotation={rotation} sign={-1} />
      <p className="text-xs text-neutral-500">
        Rebuilt from the play-by-play: each bar is a stretch on court, and the bottom strip
        shows whether the team won or lost each stretch. Hover for times. +/− is calculated
        from the rebuilt stints and can differ by a point or two from the official box score.
      </p>
    </div>
  );
}
