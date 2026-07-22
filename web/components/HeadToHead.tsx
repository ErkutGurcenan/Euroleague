import Link from "next/link";
import type { HeadToHead } from "@/lib/api";

function MeetingRow({
  m,
  h2h,
}: {
  m: HeadToHead["meetings"][number];
  h2h: HeadToHead;
}) {
  const name = (code: string) =>
    code === h2h.clubA.code
      ? h2h.clubA.abbreviatedName ?? code
      : code === h2h.clubB.code
        ? h2h.clubB.abbreviatedName ?? code
        : code;
  const homeWon = m.homeScore > m.awayScore;
  return (
    <Link
      href={`/games/${m.gameCode}`}
      className="block border-t border-neutral-800/40 py-2 text-center first:border-t-0 hover:text-orange-400"
    >
      <div className="text-xs text-neutral-500">
        {m.seasonLabel} · {m.stage.replace("Round ", "R")}
      </div>
      <div className="text-sm">
        {name(m.homeCode)}{" "}
        <span className={homeWon ? "font-bold" : "text-neutral-500"}>
          {m.homeScore}
        </span>
        –
        <span className={!homeWon ? "font-bold" : "text-neutral-500"}>
          {m.awayScore}
        </span>{" "}
        {name(m.awayCode)}
      </div>
    </Link>
  );
}

function Timeline({ h2h }: { h2h: HeadToHead }) {
  const chrono = [...h2h.meetings].reverse(); // oldest -> newest
  return (
    <div className="text-center">
      <div className="mb-2 text-xs uppercase text-neutral-500">
        Rivalry timeline
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1">
        <span className="mr-1 text-xs text-neutral-500">
          {chrono[0]?.seasonLabel.slice(0, 4)}
        </span>
        {chrono.map((m) => (
          <Link
            key={m.gameCode}
            href={`/games/${m.gameCode}`}
            title={`${m.seasonLabel} ${m.stage}: ${m.homeCode} ${m.homeScore}–${m.awayScore} ${m.awayCode}`}
            className={`h-3.5 w-3.5 rounded-full ${
              m.winner === h2h.clubA.code ? "bg-orange-500" : "bg-neutral-600"
            } hover:ring-2 hover:ring-white/40`}
          />
        ))}
        <span className="ml-1 text-xs text-neutral-500">
          {chrono[chrono.length - 1]?.seasonLabel.slice(-5)}
        </span>
      </div>
      <div className="mt-2 flex justify-center gap-4 text-xs text-neutral-500">
        <span>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-orange-500 align-[-1px]" />
          {h2h.clubA.abbreviatedName}
        </span>
        <span>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-neutral-600 align-[-1px]" />
          {h2h.clubB.abbreviatedName}
        </span>
      </div>
    </div>
  );
}

function MeetingsTable({ h2h }: { h2h: HeadToHead }) {
  const name = (code: string) =>
    code === h2h.clubA.code
      ? h2h.clubA.abbreviatedName ?? code
      : h2h.clubB.abbreviatedName ?? code;
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-800">
      <table className="w-full whitespace-nowrap text-sm">
        <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
          <tr>
            <th className="px-3 py-2">Season</th>
            <th className="px-3 py-2">Stage</th>
            <th className="px-3 py-2 text-right">Result</th>
          </tr>
        </thead>
        <tbody>
          {h2h.meetings.map((m) => {
            const homeWon = m.homeScore > m.awayScore;
            return (
              <tr key={m.gameCode} className="border-t border-neutral-800/60">
                <td className="px-3 py-2">{m.seasonLabel}</td>
                <td className="px-3 py-2 text-neutral-400">{m.stage}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <Link
                    href={`/games/${m.gameCode}`}
                    className="hover:text-orange-400"
                  >
                    {name(m.homeCode)}{" "}
                    <span className={homeWon ? "font-bold" : "text-neutral-500"}>
                      {m.homeScore}
                    </span>
                    –
                    <span className={!homeWon ? "font-bold" : "text-neutral-500"}>
                      {m.awayScore}
                    </span>{" "}
                    {name(m.awayCode)}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function HeadToHead({
  h2h,
  limit,
  wide = false,
  variant,
}: {
  h2h: HeadToHead;
  limit?: number;
  wide?: boolean;
  variant?: "full";
}) {
  const { clubA, clubB, record } = h2h;
  const totalWins = record.a + record.b || 1;
  const aPct = (100 * record.a) / totalWins;
  const meetings = limit ? h2h.meetings.slice(0, limit) : h2h.meetings;

  const summary = (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {clubA.crestUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clubA.crestUrl} alt="" className="h-6 w-6 object-contain" />
          )}
          <span className="truncate font-medium">{clubA.abbreviatedName}</span>
        </div>
        <div className="shrink-0 text-2xl font-bold tabular-nums">
          {record.a}
          <span className="mx-1 text-base text-neutral-500">–</span>
          <span className="text-neutral-300">{record.b}</span>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-2">
          <span className="truncate font-medium">{clubB.abbreviatedName}</span>
          {clubB.crestUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clubB.crestUrl} alt="" className="h-6 w-6 object-contain" />
          )}
        </div>
      </div>

      <div className="mb-4 flex h-2 overflow-hidden rounded-full bg-neutral-800">
        <div className="bg-orange-600" style={{ width: `${aPct}%` }} />
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <Split label="Regular season" a={h2h.regularSeason.a} b={h2h.regularSeason.b} />
        <Split label="Playoffs & finals" a={h2h.playoffs.a} b={h2h.playoffs.b} />
        <Split label="Avg points" a={h2h.avgPoints.a} b={h2h.avgPoints.b} />
        <Split
          label="Biggest win"
          a={h2h.biggestWin.a ? `+${h2h.biggestWin.a.margin}` : "–"}
          b={h2h.biggestWin.b ? `+${h2h.biggestWin.b.margin}` : "–"}
        />
      </div>
    </div>
  );

  const meetingList = (
    <div className="text-center">
      <div className="mb-1 text-xs uppercase text-neutral-500">
        {limit ? `Last ${meetings.length} meetings` : `All ${meetings.length} meetings`}
      </div>
      <div>
        {meetings.map((m) => (
          <MeetingRow key={m.gameCode} m={m} h2h={h2h} />
        ))}
      </div>
    </div>
  );

  if (variant === "full") {
    return (
      <div className="space-y-6">
        {summary}
        {h2h.total > 1 && <Timeline h2h={h2h} />}
        <MeetingsTable h2h={h2h} />
      </div>
    );
  }

  if (wide) {
    return (
      <div
        className={`grid gap-x-8 gap-y-4 lg:grid-cols-2 ${
          limit ? "lg:items-center" : "lg:items-start"
        }`}
      >
        {summary}
        {meetingList}
      </div>
    );
  }
  return (
    <div>
      {summary}
      <div className="mt-4">{meetingList}</div>
    </div>
  );
}

function Split({
  label,
  a,
  b,
}: {
  label: string;
  a: number | string | null;
  b: number | string | null;
}) {
  return (
    <>
      <span className="text-left font-medium tabular-nums">{a ?? "–"}</span>
      <span className="self-center text-center text-xs uppercase text-neutral-500">
        {label}
      </span>
      <span className="text-right tabular-nums text-neutral-400">{b ?? "–"}</span>
    </>
  );
}
