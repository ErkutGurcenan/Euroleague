import type { ShotPoint } from "@/lib/api";

/* Same coordinate system as ShotChart: cm, origin at basket, y up-court,
   SVG y flipped via sy = 1100 - y. */
const flip = (y: number) => 1100 - y;

function arcPoints(r: number, maxDeg: number, steps = 48): string {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const phi = ((-maxDeg + (i * 2 * maxDeg) / steps) * Math.PI) / 180;
    pts.push(
      `${(r * Math.sin(phi)).toFixed(1)} ${flip(r * Math.cos(phi)).toFixed(1)}`,
    );
  }
  return pts.join(" L ");
}

/* Ten zones, NBA-style. Sector splits are ±30° off the y-axis from the basket. */
type ZoneId =
  | "ra" | "paint" | "mrl" | "mrc" | "mrr"
  | "c3l" | "c3r" | "ab3l" | "ab3c" | "ab3r";

function zoneOf(s: ShotPoint): ZoneId {
  const angle = (Math.atan2(s.x, Math.max(s.y, 1)) * 180) / Math.PI;
  if (s.three) {
    if (s.y <= 141) return s.x < 0 ? "c3l" : "c3r";
    if (angle < -30) return "ab3l";
    if (angle > 30) return "ab3r";
    return "ab3c";
  }
  const dist = Math.hypot(s.x, s.y);
  if (dist <= 137.5 || (Math.abs(s.x) <= 137.5 && s.y < 0)) return "ra";
  if (Math.abs(s.x) <= 245 && s.y <= 422.5) return "paint";
  if (angle < -30) return "mrl";
  if (angle > 30) return "mrr";
  return "mrc";
}

/* Label anchors (court coords) — corners are rotated to fit. */
const LABELS: Record<ZoneId, { x: number; y: number; rotate?: boolean }> = {
  ra: { x: 0, y: 25 },
  paint: { x: 0, y: 320 },
  mrl: { x: -430, y: 170 },
  mrc: { x: 0, y: 540 },
  mrr: { x: 430, y: 170 },
  c3l: { x: -707, y: 0, rotate: true },
  c3r: { x: 707, y: 0, rotate: true },
  ab3l: { x: -595, y: 590 },
  ab3c: { x: 0, y: 855 },
  ab3r: { x: 595, y: 590 },
};

function fillFor(made: number, att: number): string {
  if (!att) return "#3f3f46";
  const pct = (100 * made) / att;
  if (pct > 50) return "#15803d";
  if (pct > 25) return "#d97706";
  return "#b91c1c";  // 25% and below is red
}

const INSIDE_3PT = `M -660 ${flip(-157.5)} L -660 ${flip(141)} L ${arcPoints(
  675, 77.87,
)} L 660 ${flip(141)} L 660 ${flip(-157.5)} Z`;

/* Sector polygons from the basket to the court edges (±30° rays hit the
   y=1050 clip line at x = 1050·tan30 ≈ ±606). */
const SECT_L = `M 0 ${flip(0)} L -606 ${flip(1050)} L -750 ${flip(1050)} L -750 ${flip(-157.5)} L 0 ${flip(-157.5)} Z`;
const SECT_C = `M 0 ${flip(-157.5)} L -606 ${flip(1050)} L 606 ${flip(1050)} L 0 ${flip(-157.5)} Z`;
const SECT_R = `M 0 ${flip(0)} L 606 ${flip(1050)} L 750 ${flip(1050)} L 750 ${flip(-157.5)} L 0 ${flip(-157.5)} Z`;
const RA_PATH = `M -137.5 ${flip(-157.5)} L -137.5 ${flip(0)} L ${arcPoints(
  137.5, 90, 24,
)} L 137.5 ${flip(-157.5)} Z`;

export default function ZoneChart({ shots }: { shots: ShotPoint[] }) {
  const zones = {} as Record<ZoneId, { made: number; att: number }>;
  (Object.keys(LABELS) as ZoneId[]).forEach((z) => {
    zones[z] = { made: 0, att: 0 };
  });
  for (const s of shots) {
    if (Math.abs(s.x) > 750 || s.y > 1050) continue;
    const z = zoneOf(s);
    zones[z].att += 1;
    if (s.made) zones[z].made += 1;
  }

  const zonePaths: { id: ZoneId; el: React.ReactNode }[] = [
    { id: "ab3l", el: <path d={SECT_L} /> },
    { id: "ab3c", el: <path d={SECT_C} /> },
    { id: "ab3r", el: <path d={SECT_R} /> },
    {
      id: "c3l",
      el: <rect x={-750} y={flip(141)} width={90} height={298.5} />,
    },
    {
      id: "c3r",
      el: <rect x={660} y={flip(141)} width={90} height={298.5} />,
    },
    { id: "mrl", el: <path d={SECT_L} clipPath="url(#inside3)" /> },
    { id: "mrc", el: <path d={SECT_C} clipPath="url(#inside3)" /> },
    { id: "mrr", el: <path d={SECT_R} clipPath="url(#inside3)" /> },
    {
      id: "paint",
      el: <rect x={-245} y={flip(422.5)} width={490} height={580} />,
    },
    { id: "ra", el: <path d={RA_PATH} /> },
  ];

  return (
    <div>
      <svg
        viewBox="-765 30 1530 1235"
        className="w-full max-w-xl rounded-lg border border-neutral-800 bg-neutral-900/40"
        role="img"
        aria-label="Shooting by zone"
      >
        <defs>
          <clipPath id="inside3">
            <path d={INSIDE_3PT} />
          </clipPath>
        </defs>
        <g stroke="#171717" strokeWidth="5" fillOpacity={0.85}>
          {zonePaths.map(({ id, el }) => (
            <g key={id} fill={fillFor(zones[id].made, zones[id].att)}>
              {el}
            </g>
          ))}
        </g>
        <g stroke="#e5e5e5" strokeWidth="6" fill="none" opacity={0.7}>
          <rect x={-750} y={flip(1050)} width={1500} height={1207.5} />
          <rect x={-245} y={flip(422.5)} width={490} height={580} />
          <path d={INSIDE_3PT.replace(/ Z$/, "")} />
          {/* rim/backboard drawn near the baseline (decorative here —
              zone shapes, not the rim, carry the data) */}
          <line x1={-90} y1={flip(-125)} x2={90} y2={flip(-125)} strokeWidth="8" />
          <circle cx={0} cy={flip(-95)} r={22.5} />
        </g>
        {(Object.keys(LABELS) as ZoneId[]).map((z) => {
          const { made, att } = zones[z];
          const l = LABELS[z];
          const sx = l.x;
          const sy = flip(l.y);
          const transform = l.rotate
            ? `rotate(${l.x < 0 ? -90 : 90} ${sx} ${sy})`
            : undefined;
          return (
            <g
              key={z}
              transform={transform}
              fill="#fafafa"
              stroke="#171717"
              strokeWidth={7}
              paintOrder="stroke"
              fontSize={48}
              fontWeight={600}
              textAnchor="middle"
            >
              <text x={sx} y={sy - 8}>
                {att ? `${made} / ${att}` : "0 / 0"}
              </text>
              <text x={sx} y={sy + 48}>
                {att ? `${Math.round((1000 * made) / att) / 10}%` : "–"}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex gap-4 text-xs text-neutral-400">
        <span>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-green-700" />
          &gt;50%
        </span>
        <span>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-amber-600" />
          &gt;25–50%
        </span>
        <span>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-red-700" />
          ≤25%
        </span>
        <span>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-zinc-700" />
          No attempts
        </span>
      </div>
    </div>
  );
}
