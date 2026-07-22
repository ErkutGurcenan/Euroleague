export const metadata = { title: "Roll of honor" };

import Link from "next/link";
import Headshot from "@/components/Headshot";
import { getHonorRoll, type HonorAward } from "@/lib/api";

const AWARD_ICON: Record<string, string> = {
  MVP: "🏅",
  "Final Four MVP": "🏆",
  "Rising Star": "✨",
  "Best Defender": "🛡️",
};

function AwardCell({ award }: { award: HonorAward }) {
  if (!award) return <span className="text-neutral-600">–</span>;
  return (
    <Link
      href={`/players/${award.playerCode}/career`}
      className="flex items-center gap-2 hover:text-orange-400"
    >
      <Headshot src={award.imageUrl} name={award.name} size={26} />
      <span className="min-w-0">
        <span className="block truncate text-sm">{award.name}</span>
        {award.clubCrest && (
          <span className="flex items-center gap-1 text-xs text-neutral-500">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={award.clubCrest}
              alt=""
              className="h-3 w-3 object-contain"
            />
            {award.clubCode}
          </span>
        )}
      </span>
    </Link>
  );
}

export default async function HonorPage() {
  const { awardTypes, seasons } = await getHonorRoll();

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Roll of honor</h1>
        <Link
          href="/champions"
          className="text-sm text-orange-400 hover:underline"
        >
          Champions history →
        </Link>
      </div>
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-neutral-900 text-left text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-3 py-2">Season</th>
              <th className="px-3 py-2">Champion</th>
              {awardTypes.map((t) => (
                <th key={t} className="px-3 py-2">
                  {AWARD_ICON[t]} {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {seasons.map((s) => (
              <tr
                key={s.season}
                className="border-t border-neutral-800/60 align-top"
              >
                <td className="whitespace-nowrap px-3 py-3 font-medium">
                  {s.seasonLabel}
                </td>
                {s.canceled ? (
                  <td
                    colSpan={awardTypes.length + 1}
                    className="px-3 py-3 text-sm italic text-neutral-500"
                  >
                    {s.note}
                  </td>
                ) : (
                  <>
                    <td className="px-3 py-3">
                      {s.champion ? (
                        <Link
                          href={`/teams/${s.champion.code}`}
                          className="flex items-center gap-2 font-medium hover:text-orange-400"
                        >
                          {s.champion.crestUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={s.champion.crestUrl}
                              alt=""
                              className="h-6 w-6 object-contain"
                            />
                          )}
                          <span className="min-w-0 truncate">
                            {s.champion.name}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-neutral-600">–</span>
                      )}
                    </td>
                    {awardTypes.map((t) => (
                      <td key={t} className="px-3 py-3">
                        <AwardCell award={s.awards[t]} />
                      </td>
                    ))}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-neutral-500">
        Champions from the Final Four; individual awards are official EuroLeague
        honors. Player names link to their career pages.
      </p>
    </div>
  );
}
