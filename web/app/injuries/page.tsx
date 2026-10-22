export const metadata = { title: "Injury report" };

import Link from "next/link";
import Headshot from "@/components/Headshot";
import { isUnavailable, StatusPill, timeline } from "@/components/InjuryStatus";
import { getInjuries, type InjuryEntry } from "@/lib/api";
import { seasonLabel } from "@/lib/season";

const REASON_LABELS: Record<InjuryEntry["reason"], string> = {
  injury: "Injury",
  illness: "Illness",
  coach: "Coach's decision",
  roster: "Not in roster",
  rest: "Rest",
  other: "Undisclosed",
};

function availability(e: InjuryEntry): string | null {
  if (e.gamesMissed === null) return null;
  if (!e.lastGame) return "Hasn't played this season";
  const last = `last played R${e.lastGame.round} vs ${e.lastGame.opponent}`;
  return e.gamesMissed === 0 ? `Played last game` : `Missed ${e.gamesMissed} · ${last}`;
}

function PlayerName({ e }: { e: InjuryEntry }) {
  return e.personCode ? (
    <Link
      href={`/players/${e.personCode}`}
      className="truncate font-medium hover:text-orange-400"
    >
      {e.player}
    </Link>
  ) : (
    <span className="truncate font-medium">{e.player}</span>
  );
}

function ClubLink({ e }: { e: InjuryEntry }) {
  return (
    <Link
      href={`/teams/${e.club}`}
      className="flex min-w-0 items-center gap-2 hover:text-orange-400"
    >
      {e.clubCrest && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.clubCrest} alt="" className="h-5 w-5 object-contain" />
      )}
      <span className="truncate">{e.clubName}</span>
    </Link>
  );
}

function SummaryTile({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-3">
      <div className="text-xs uppercase text-neutral-500">{label}</div>
      <div className="mt-0.5 text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-neutral-400">{sub}</div>
    </div>
  );
}

export default async function InjuriesPage() {
  const report = await getInjuries();
  const injured = report.entries.filter(isUnavailable);
  const cleared = report.entries.filter((e) => e.status === "Ready");
  const other = report.entries.filter((e) => !isUnavailable(e) && e.status !== "Ready");

  const byClub = new Map<string, InjuryEntry[]>();
  for (const e of injured) byClub.set(e.club, [...(byClub.get(e.club) ?? []), e]);
  const clubs = [...byClub.values()].sort(
    (a, b) => b.length - a.length || a[0].clubName.localeCompare(b[0].clubName),
  );

  const updated = new Date(`${report.sourceUpdated}Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Injury report</h1>
        <span className="text-sm text-neutral-400">
          {seasonLabel(report.season)} · updated {updated} · source{" "}
          <a
            href={report.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 hover:underline"
          >
            {report.source} ↗
          </a>
        </span>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Ruled out"
          value={injured.filter((e) => e.status === "Out").length}
          sub="will not play"
        />
        <SummaryTile
          label="Day-to-day"
          value={injured.filter((e) => e.status !== "Out").length}
          sub="availability unclear"
        />
        <SummaryTile
          label="Cleared to return"
          value={cleared.length}
          sub="back available"
        />
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-300">
        Out or doubtful
      </h2>
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {clubs.map((entries) => (
          <div
            key={entries[0].club}
            className="rounded-lg border border-neutral-800 bg-neutral-900/40"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2 text-sm font-semibold">
              <ClubLink e={entries[0]} />
              <span className="shrink-0 text-xs font-normal text-neutral-500">
                {entries.length} {entries.length === 1 ? "player" : "players"}
              </span>
            </div>
            <ul>
              {entries.map((e) => (
                <li
                  key={e.player}
                  className="flex gap-3 border-t border-neutral-800/40 px-4 py-2.5 first:border-t-0"
                >
                  <Headshot src={e.imageUrl} name={e.player} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <PlayerName e={e} />
                      <span className="text-xs text-neutral-500">{e.pos}</span>
                      <span className="ml-auto shrink-0">
                        <StatusPill status={e.status} />
                      </span>
                    </div>
                    <div className="text-sm text-neutral-300">{e.note}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-neutral-500">
                      <span className="text-neutral-400">{timeline(e.rounds)}</span>
                      {availability(e) && <span>{availability(e)}</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {cleared.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-300">
            Cleared to return
          </h2>
          <ul className="mb-8 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {cleared.map((e) => (
              <li
                key={e.player}
                className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-2"
              >
                <Headshot src={e.imageUrl} name={e.player} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <PlayerName e={e} />
                    <span className="text-xs text-neutral-500">{e.club}</span>
                  </div>
                  <div className="truncate text-xs text-neutral-400">{e.note}</div>
                </div>
                <StatusPill status={e.status} />
              </li>
            ))}
          </ul>
        </>
      )}

      <details className="group mb-6 rounded-lg border border-neutral-800">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold uppercase tracking-wide text-neutral-300 hover:text-orange-400">
          Other absences ({other.length}){" "}
          <span className="font-normal normal-case tracking-normal text-neutral-500">
            · coach&apos;s decisions, roster omissions
          </span>
        </summary>
        <div className="overflow-x-auto border-t border-neutral-800">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
              <tr>
                <th className="px-3 py-2">Player</th>
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {other.map((e) => (
                <tr key={e.player} className="border-t border-neutral-800/60">
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <Headshot src={e.imageUrl} name={e.player} size={22} />
                      <PlayerName e={e} />
                    </span>
                  </td>
                  <td className="px-3 py-2 text-neutral-400">{e.club}</td>
                  <td className="px-3 py-2">
                    <StatusPill status={e.status} />
                  </td>
                  <td className="px-3 py-2 text-neutral-400">
                    {REASON_LABELS[e.reason]}
                  </td>
                  <td className="px-3 py-2 text-neutral-400">
                    {e.note} · {timeline(e.rounds)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="text-xs text-neutral-500">
        {"Player status comes from "}
        <a
          href={report.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-400 hover:text-orange-400"
        >
          {report.source}
        </a>
        {"'s EuroLeague injury list, checked three times a day. "}Games missed and last appearances come from official EuroLeague box
        scores. &quot;Round&quot; is the round the status applies to;
        &quot;Through Round N&quot; is the expected end of an absence.
      </p>
    </div>
  );
}
