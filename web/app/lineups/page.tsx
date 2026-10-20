export const metadata = { title: "Best lineups" };

import LineupsPanel from "@/components/LineupsPanel";
import { getLeagueLineups } from "@/lib/api";
import { currentSeason } from "@/lib/season";

export default async function LineupsPage() {
  const data = await getLeagueLineups(await currentSeason());
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Best lineups</h1>
        <span className="text-sm text-neutral-400">
          Every team&apos;s five-, three- and two-player groups, rebuilt from the play-by-play
        </span>
      </div>
      <LineupsPanel data={data} />
    </div>
  );
}
