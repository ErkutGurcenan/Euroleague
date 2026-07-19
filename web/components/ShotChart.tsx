import type { ShotPoint } from "@/lib/api";

/* Court geometry in cm, origin at basket center, y pointing up-court.
   FIBA half court: 1500 wide; baseline is 157.5 behind the basket center.
   SVG y is flipped: sy = 1100 - y (basket near the bottom of the chart). */
const flip = (y: number) => 1100 - y;

/** Polyline along an arc of radius r around the basket, from -maxDeg to +maxDeg
    measured off the y-axis (0° = straight up-court). */
function arcPoints(r: number, maxDeg: number, steps = 48): string {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const phi = ((-maxDeg + (i * 2 * maxDeg) / steps) * Math.PI) / 180;
    pts.push(
      `${(r * Math.sin(phi)).toFixed(1)},${flip(r * Math.cos(phi)).toFixed(1)}`,
    );
  }
  return pts.join(" ");
}

// Three-point arc: r=675, corner lines at x=±660 -> arc meets them at
// y=sqrt(675²-660²)≈141, i.e. ±77.87° off the y-axis.
const THREE_ARC = arcPoints(675, 77.87);
const RESTRICTED_ARC = arcPoints(125, 90, 24);

export default function ShotChart({ shots }: { shots: ShotPoint[] }) {
  const visible = shots.filter((s) => s.y <= 1050 && Math.abs(s.x) <= 750);
  const made = visible.filter((s) => s.made).length;
  // season-aggregate charts have thousands of shots — shrink and fade dots
  const dense = visible.length > 600;
  const dotR = dense ? 7 : 12;
  const dotOpacity = dense ? 0.45 : 0.8;

  return (
    <div>
      <svg
        viewBox="-765 30 1530 1235"
        className="w-full max-w-xl rounded-lg border border-neutral-800 bg-neutral-900/40"
        role="img"
        aria-label="Shot chart"
      >
        <g stroke="#737373" strokeWidth="7" fill="none" strokeLinecap="round">
          {/* boundary: baseline + sidelines (clipped before half court) */}
          <rect x={-750} y={flip(1050)} width={1500} height={1207.5} />
          {/* paint (FIBA key: 490 wide, free-throw line 580 from baseline) */}
          <rect x={-245} y={flip(422.5)} width={490} height={580} />
          {/* free-throw circle */}
          <circle cx={0} cy={flip(422.5)} r={180} />
          {/* three-point line: left corner, arc, right corner */}
          <polyline
            points={`-660,${flip(-157.5)} -660,${flip(141)} ${THREE_ARC} 660,${flip(141)} 660,${flip(-157.5)}`}
          />
          {/* restricted area */}
          <polyline points={RESTRICTED_ARC} />
          {/* backboard (120 from baseline, 180 wide) and rim */}
          <line
            x1={-90}
            y1={flip(-37.5)}
            x2={90}
            y2={flip(-37.5)}
            stroke="#a3a3a3"
            strokeWidth="9"
          />
          <circle cx={0} cy={flip(0)} r={22.5} stroke="#ea580c" />
        </g>
        {visible.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={flip(s.y)}
            r={dotR}
            fill={s.made ? "#10b981" : "none"}
            stroke={s.made ? "none" : "#f87171"}
            strokeWidth={dense ? 3 : 4.5}
            opacity={dotOpacity}
          />
        ))}
      </svg>
      <div className="mt-2 flex gap-4 text-xs text-neutral-400">
        <span>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Made ({made})
        </span>
        <span>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full border-2 border-red-400" />
          Missed ({visible.length - made})
        </span>
        <span className="ml-auto">
          FG {made}/{visible.length} (
          {visible.length ? Math.round((100 * made) / visible.length) : 0}%)
        </span>
      </div>
    </div>
  );
}
