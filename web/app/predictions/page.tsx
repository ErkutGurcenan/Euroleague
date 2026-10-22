export const metadata = { title: "Predictions" };

import { BacktestPanel, ChallengerPanel, MarketPanel, PaperTradingPanel, TrackRecord, UpcomingList } from "@/components/Predictions";
import PredictionsToggle from "@/components/PredictionsToggle";
import { getPredictions } from "@/lib/api";
import { currentSeason } from "@/lib/season";

export default async function PredictionsPage() {
  const data = await getPredictions(await currentSeason());
  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Predictions</h1>
          <PredictionsToggle active="overview" />
        </div>
        <span className="text-sm text-neutral-400">
          Win probabilities from power ratings, season efficiency and home court
        </span>
      </div>
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">{data.upcomingRound ? `Coming up: ${data.upcomingRound}` : "Coming up"}</h2>
        <UpcomingList items={data.upcoming} />
      </section>
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Track record this season</h2>
        <TrackRecord data={data} />
      </section>
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Eurostepper vs AI</h2>
        <ChallengerPanel data={data} />
      </section>
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Against the market</h2>
        <MarketPanel data={data} />
      </section>
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Paper trading</h2>
        <PaperTradingPanel data={data} />
      </section>
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">How accurate is the model?</h2>
        <BacktestPanel data={data} />
      </section>
    </div>
  );
}
