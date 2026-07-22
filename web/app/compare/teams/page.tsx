export const metadata = { title: "Compare teams" };

import Link from "next/link";
import HeadToHead from "@/components/HeadToHead";
import ShotChart from "@/components/ShotChart";
import TeamPicker from "@/components/TeamPicker";
import ZoneChart from "@/components/ZoneChart";
import { getClub, getClubShots, getHeadToHead } from "@/lib/api";
import { currentSeason } from "@/lib/season";

type ClubBundle = Awaited<ReturnType<typeof getClub>>;

function StatRow({
  label,
  a,
  b,
  higherWins = true,
}: {
  label: string;
  a: number | string | null;
  b: number | string | null;
  higherWins?: boolean;
}) {
  const na = typeof a === "number" ? a : null;
  const nb = typeof b === "number" ? b : null;
  const aWins =
    na !== null && nb !== null && na !== nb && (higherWins ? na > nb : na < nb);
  const bWins =
    na !== null && nb !== null && na !== nb && (higherWins ? nb > na : nb < na);
  return (
    <div className="flex items-center justify-between border-t border-neutral-800/60 px-4 py-2 text-sm">
      <span
        className={`w-20 text-left tabular-nums ${
          aWins ? "font-bold text-orange-400" : ""
        }`}
      >
        {a ?? "–"}
      </span>
      <span className="text-xs uppercase text-neutral-500">{label}</span>
      <span
        className={`w-20 text-right tabular-nums ${
          bWins ? "font-bold text-orange-400" : ""
        }`}
      >
        {b ?? "–"}
      </span>
    </div>
  );
}

function TeamHeader({ bundle }: { bundle: ClubBundle }) {
  return (
    <div className="mt-3 flex items-center gap-3">
      {bundle.club.crestUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bundle.club.crestUrl}
          alt=""
          className="h-10 w-10 object-contain"
        />
      )}
      <div className="min-w-0">
        <Link
          href={`/teams/${bundle.club.code}`}
          className="font-semibold hover:text-orange-400"
        >
          {bundle.club.name}
        </Link>
        <p className="text-xs text-neutral-400">
          {bundle.stats && `${bundle.stats.wins}–${bundle.stats.losses}`}
        </p>
      </div>
    </div>
  );
}

export default async function CompareTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const season = await currentSeason();
  const safe = <T,>(p: Promise<T>) => p.catch(() => null);
  const [ta, tb, sa, sb, h2h] = await Promise.all([
    a ? safe(getClub(a.toUpperCase(), season)) : null,
    b ? safe(getClub(b.toUpperCase(), season)) : null,
    a ? safe(getClubShots(a.toUpperCase(), season)) : null,
    b ? safe(getClubShots(b.toUpperCase(), season)) : null,
    a && b ? safe(getHeadToHead(a.toUpperCase(), b.toUpperCase())) : null,
  ]);

  const qa = ta?.stats?.quarters ?? [];
  const qb = tb?.stats?.quarters ?? [];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Compare teams</h1>
        <span className="flex overflow-hidden rounded-md border border-neutral-700 text-xs">
          <Link
            href="/compare"
            className="px-2 py-1 text-neutral-400 hover:text-white"
          >
            Players
          </Link>
          <span className="bg-neutral-800 px-2 py-1 text-white">Teams</span>
        </span>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <TeamPicker slot="a" currentName={ta?.club.name ?? null} />
          {ta && <TeamHeader bundle={ta} />}
        </div>
        <div>
          <TeamPicker slot="b" currentName={tb?.club.name ?? null} />
          {tb && <TeamHeader bundle={tb} />}
        </div>
      </div>

      {ta?.stats && tb?.stats ? (
        <>
          <div className="mb-8 rounded-lg border border-neutral-800 bg-neutral-900/40">
            <div className="flex items-center justify-between px-4 py-2 text-sm font-medium">
              <span>{ta.club.abbreviatedName}</span>
              <span>{tb.club.abbreviatedName}</span>
            </div>
            <StatRow label="Record" a={`${ta.stats.wins}–${ta.stats.losses}`} b={`${tb.stats.wins}–${tb.stats.losses}`} />
            <StatRow label="Points" a={ta.stats.points} b={tb.stats.points} />
            <StatRow label="Opp points" a={ta.stats.opponentPoints} b={tb.stats.opponentPoints} higherWins={false} />
            <StatRow label="Rebounds" a={ta.stats.rebounds} b={tb.stats.rebounds} />
            <StatRow label="Assists" a={ta.stats.assists} b={tb.stats.assists} />
            <StatRow label="Steals" a={ta.stats.steals} b={tb.stats.steals} />
            <StatRow label="Turnovers" a={ta.stats.turnovers} b={tb.stats.turnovers} higherWins={false} />
            <StatRow label="2P%" a={ta.stats.fg2Pct} b={tb.stats.fg2Pct} />
            <StatRow label="3P%" a={ta.stats.fg3Pct} b={tb.stats.fg3Pct} />
            <StatRow label="FT%" a={ta.stats.ftPct} b={tb.stats.ftPct} />
            {qa.map((q, i) => (
              <StatRow
                key={q.quarter}
                label={`Q${q.quarter} net`}
                a={q.net}
                b={qb[i]?.net ?? null}
              />
            ))}
          </div>

          {h2h && h2h.total > 0 && (
            <div className="mb-8">
              <h2 className="mb-3 text-lg font-semibold">
                All-time head-to-head
              </h2>
              <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
                <HeadToHead h2h={h2h} variant="full" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {[sa, sb].map(
              (s, i) =>
                s && (
                  <div key={i} className="space-y-4">
                    <ShotChart shots={s.shots} />
                    <ZoneChart shots={s.shots} />
                  </div>
                ),
            )}
          </div>
        </>
      ) : (
        <p className="text-neutral-400">Pick two teams to compare their season.</p>
      )}
    </div>
  );
}
