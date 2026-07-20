type Entry = {
  value: number;
  won: boolean | null;
  label: string;
};

export default function GameLogChart({
  entries,
  title,
  unit,
}: {
  entries: Entry[];
  title: string;
  unit: string;
}) {
  if (entries.length < 2) return null;
  const W = 640;
  const H = 110;
  const PAD = { left: 30, right: 6, top: 8, bottom: 6 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const values = entries.map((e) => e.value);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const y = (v: number) =>
    PAD.top + innerH - ((v - min) / (max - min || 1)) * innerH;
  const slot = innerW / entries.length;
  const barW = Math.min(14, Math.max(3, slot * 0.7));

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs uppercase text-neutral-500">{title}</span>
        <span className="text-xs tabular-nums text-neutral-400">
          avg {avg.toFixed(1)} · high {Math.max(...values)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`${title} per game`}
      >
        {[max, min < 0 ? 0 : null].map(
          (v) =>
            v !== null && (
              <g key={v}>
                <line
                  x1={PAD.left}
                  y1={y(v)}
                  x2={W - PAD.right}
                  y2={y(v)}
                  stroke="#262626"
                  strokeWidth="1"
                />
                <text x={2} y={y(v) + 3.5} fontSize="10" fill="#737373">
                  {v}
                </text>
              </g>
            ),
        )}
        <line
          x1={PAD.left}
          y1={y(avg)}
          x2={W - PAD.right}
          y2={y(avg)}
          stroke="#a3a3a3"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        <text x={2} y={y(avg) + 3.5} fontSize="10" fill="#a3a3a3">
          {avg.toFixed(0)}
        </text>
        {entries.map((e, i) => {
          const x0 = PAD.left + i * slot + (slot - barW) / 2;
          const zero = y(Math.max(0, min));
          const top = Math.min(y(e.value), zero);
          const h = Math.max(Math.abs(y(e.value) - zero), 1.5);
          return (
            <rect
              key={i}
              x={x0}
              y={top}
              width={barW}
              height={h}
              rx={1.5}
              fill={e.won === null ? "#737373" : e.won ? "#10b981" : "#ef4444"}
              opacity={0.85}
            >
              <title>{`${e.label}: ${e.value} ${unit}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-1 flex gap-3 text-xs text-neutral-500">
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-500" />
          win
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-red-500" />
          loss
        </span>
        <span className="ml-auto">dashed = season average · hover bars</span>
      </div>
    </div>
  );
}
