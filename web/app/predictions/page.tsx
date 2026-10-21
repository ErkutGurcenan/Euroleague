export const metadata = { title: "Predictions" };

import { BacktestPanel, ChallengerPanel, TrackRecord, UpcomingList } from "@/components/Predictions";
import { getPredictions } from "@/lib/api";
import { currentSeason } from "@/lib/season";

export default async function PredictionsPage() {
  const data = await getPredictions(await currentSeason());
  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Predictions</h1>
        <span className="text-sm text-neutral-400">
          Win probabilities from power ratings, season efficiency and home court
        </span>
      </div>
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Next 7 days</h2>
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
        <h2 className="text-lg font-semibold">How accurate is the model?</h2>
        <BacktestPanel data={data} />
      </section>
    </div>
  );
}
