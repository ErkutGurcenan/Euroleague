export const metadata = { title: "Power rankings" };

import { PowerRankingsTable } from "@/components/Ratings";
import { getRankings } from "@/lib/api";
import { currentSeason } from "@/lib/season";

export default async function RankingsPage() {
  const { teams } = await getRankings(await currentSeason());
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Power rankings</h1>
        <span className="text-sm text-neutral-400">How strong each team is right now, from every result</span>
      </div>
      {teams.length > 0 ? (
        <PowerRankingsTable teams={teams} />
      ) : (
        <p className="text-sm text-neutral-500">No games played yet this season.</p>
      )}
    </div>
  );
}
