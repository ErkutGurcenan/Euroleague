import type { ClubHistory, ClubHistorySeason } from "@/lib/api";

const RESULT: Record<
  ClubHistorySeason["result"],
  { label: string; cls: string }
> = {
  champion: { label: "Champion", cls: "bg-orange-600 text-white" },
  runner_up: { label: "Runner-up", cls: "bg-neutral-700 text-neutral-100" },
  final_four: { label: "Final Four", cls: "bg-neutral-800 text-neutral-300" },
  playoffs: { label: "Playoffs", cls: "bg-neutral-800/60 text-neutral-400" },
  play_in: { label: "Play-in", cls: "bg-neutral-800/60 text-neutral-400" },
  regular_season: {
    label: "Regular season",
    cls: "bg-neutral-800/40 text-neutral-500",
  },
  canceled: { label: "Canceled", cls: "bg-neutral-800/40 text-neutral-500" },
};

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-3 text-center">
      <div className="text-lg font-bold tabular-nums">{value}</div>
      <div className="text-xs uppercase text-neutral-500">{label}</div>
    </div>
  );
}

export default function FranchiseHistory({ data }: { data: ClubHistory }) {
  const s = data.summary;
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">Franchise history</h2>
      <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
        <Tile label="Seasons" value={s.seasons} />
        <Tile label="Titles" value={s.titles} />
        <Tile label="Final Fours" value={s.finalFours} />
        <Tile
          label="Best finish"
          value={s.bestFinish ? `${s.bestFinish}${ordinal(s.bestFinish)}` : "–"}
        />
        <Tile label="All-time" value={`${s.wins}–${s.losses}`} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-3 py-2">Season</th>
              <th className="px-2 py-2 text-right">W</th>
              <th className="px-2 py-2 text-right">L</th>
              <th className="px-3 py-2 text-right">Finish</th>
              <th className="px-3 py-2">Result</th>
            </tr>
          </thead>
          <tbody>
            {data.seasons.map((x) => {
              const r = RESULT[x.result];
              return (
                <tr
                  key={x.season}
                  className={`border-t border-neutral-800/60 ${
                    x.result === "champion" ? "bg-orange-950/20" : ""
                  }`}
                >
                  <td className="px-3 py-2">{x.seasonLabel}</td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {x.wins ?? "–"}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-neutral-400">
                    {x.losses ?? "–"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-400">
                    {x.position ? `${x.position}${ordinal(x.position)}` : "–"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${r.cls}`}
                    >
                      {r.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
