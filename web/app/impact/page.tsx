export const metadata = { title: "Player impact" };

import { OnOffRanking } from "@/components/OnOff";
import { getLeagueOnOff } from "@/lib/api";
import { currentSeason } from "@/lib/season";

export default async function ImpactPage() {
  const data = await getLeagueOnOff(await currentSeason());
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Player impact</h1>
        <span className="text-sm text-neutral-400">
          On/off swing: how much better each team was with the player on the court
        </span>
      </div>
      <OnOffRanking data={data} limit={50} />
    </div>
  );
}
