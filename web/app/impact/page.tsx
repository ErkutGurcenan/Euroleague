export const metadata = { title: "Player impact" };

import Link from "next/link";
import { AdjustedLeaderboard } from "@/components/AdjustedImpact";
import { OnOffRanking } from "@/components/OnOff";
import { getAdjustedImpact, getLeagueOnOff } from "@/lib/api";
import { currentSeason } from "@/lib/season";

export default async function ImpactPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const view = (await searchParams).view === "onoff" ? "onoff" : "adjusted";
  const season = await currentSeason();
  const tab = (active: boolean) =>
    `px-3 py-1 text-xs transition-colors ${active ? "bg-orange-600 text-white" : "text-neutral-400 hover:text-white"}`;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Player impact</h1>
          <span className="flex overflow-hidden rounded-md border border-neutral-700">
            <Link href="/impact" className={tab(view === "adjusted")}>
              Adjusted
            </Link>
            <Link href="/impact?view=onoff" className={tab(view === "onoff")}>
              On/off
            </Link>
          </span>
        </div>
        <span className="text-sm text-neutral-400">
          {view === "adjusted"
            ? "Points per 100 possessions added, accounting for teammates and opponents"
            : "How much better each team was with the player on the court"}
        </span>
      </div>
      {view === "adjusted" ? (
        <AdjustedLeaderboard data={await getAdjustedImpact(season)} />
      ) : (
        <OnOffRanking data={await getLeagueOnOff(season)} limit={50} />
      )}
    </div>
  );
}
