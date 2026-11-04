import { notFound } from "next/navigation";
import Link from "@/components/Link";
import { PredictionCard } from "@/components/Predictions";
import { getRoundPreview, type PreviewGame, type PreviewTeam } from "@/lib/api";
import { clubAbbr } from "@/lib/clubs";
import { currentSeason } from "@/lib/season";

export async function generateMetadata({ params }: { params: Promise<{ round: string }> }) {
  const { round } = await params;
  return { title: `Round ${round} preview` };
}

function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${s}`;
}

function day(iso: string | null, withTime = false): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** The home team's chance from each source, and who it makes the favourite. */
function picks(g: PreviewGame) {
  const p = g.prediction;
  const side = (prob: number | null | undefined) =>
    prob === null || prob === undefined || prob === 0.5 ? null : prob > 0.5 ? g.home : g.away;
  return {
    ours: p ? side(p.homeWinProb) : null,
    jev: p?.ai ? side(p.ai.homeWinProb) : null,
    market: p?.market ? side(p.market.homePrice) : null,
    homeWon: g.result ? g.result.homeScore > g.result.awayScore : null,
  };
}

function Form({ form }: { form: string[] }) {
  if (form.length === 0) return <span className="text-xs text-neutral-500">no games yet</span>;
  return (
    <span className="inline-flex gap-0.5" aria-label={`Last ${form.length}: ${form.join(" ")}`}>
      {form.map((r, i) => (
        <span
          key={i}
          className={`flex h-4 w-4 items-center justify-center rounded-sm text-[10px] font-bold ${
            r === "W" ? "bg-emerald-600/80 text-white" : "bg-red-600/70 text-white"
          }`}
        >
          {r}
        </span>
      ))}
    </span>
  );
}

function Team({ t, right = false }: { t: PreviewTeam; right?: boolean }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${right ? "flex-row-reverse text-right" : ""}`}>
      {t.clubCrest && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t.clubCrest} alt="" className="h-7 w-7 shrink-0 object-contain sm:h-9 sm:w-9" />
      )}
      <div className="grid min-w-0 gap-0.5">
        <Link href={`/teams/${t.clubCode}`} className="text-sm font-semibold leading-tight hover:text-orange-400 sm:truncate sm:text-base" title={t.clubName}>
          {t.shortName}
        </Link>
        <span className="text-xs text-neutral-400">
          {t.position ? `${ordinal(t.position)} · ` : ""}
          {t.wins}–{t.losses}
        </span>
        <span className={`flex ${right ? "justify-end" : ""}`}>
          <Form form={t.form} />
        </span>
        <span className="text-xs text-neutral-500">
          Power {t.rating}
          {t.rank ? ` (#${t.rank})` : ""}
        </span>
      </div>
    </div>
  );
}

function OutList({ t }: { t: PreviewTeam }) {
  return (
    <div className="text-xs">
      <span className="font-semibold text-neutral-300">{clubAbbr(t.clubCode)} out or doubtful: </span>
      {t.out.length === 0 ? (
        <span className="text-neutral-500">none reported</span>
      ) : (
        <span className="text-neutral-400">
          {t.out.map((o, i) => (
            <span key={o.player}>
              {i > 0 && "; "}
              {o.player} ({o.status.toLowerCase()})
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

function GameCard({ g }: { g: PreviewGame }) {
  const h2h = g.headToHead;
  return (
    <section className="grid gap-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="flex items-baseline justify-between gap-2 text-xs text-neutral-500">
        <span>{day(g.utcDate, true)} UTC</span>
        <Link href={`/games/${g.gameCode}`} className="text-orange-400 hover:underline">
          Match page →
        </Link>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Team t={g.home} />
        <div className="text-center text-xl font-bold tabular-nums">
          {g.result ? `${g.result.homeScore}–${g.result.awayScore}` : <span className="text-sm text-neutral-500">v</span>}
        </div>
        <Team t={g.away} right />
      </div>
      {g.prediction ? (
        <PredictionCard p={g.prediction} compact />
      ) : (
        <p className="text-sm text-neutral-500">Our prediction appears a few days before the game.</p>
      )}
      {!g.played && (
        <div className="grid gap-1 sm:grid-cols-2">
          <OutList t={g.home} />
          <OutList t={g.away} />
        </div>
      )}
      <p className="text-xs text-neutral-400">
        {h2h.meetings === 0 ? (
          "First meeting since 2016-17."
        ) : (
          <>
            {`Earlier meetings since 2016-17: ${clubAbbr(g.home.clubCode)} ${h2h.homeWins}–${h2h.awayWins} ${clubAbbr(g.away.clubCode)}`}
            {h2h.last && (
              <>
                {" · last: "}
                <Link href={`/games/${h2h.last.gameCode}`} className="hover:text-orange-400">
                  {`${h2h.last.seasonLabel}, ${clubAbbr(h2h.last.home)} ${h2h.last.homeScore}–${h2h.last.awayScore} ${clubAbbr(h2h.last.away)}`}
                </Link>
              </>
            )}
          </>
        )}
      </p>
    </section>
  );
}

function Glance({ games }: { games: PreviewGame[] }) {
  const called = games.filter((g) => g.prediction);
  const upcoming = called.filter((g) => !g.played);
  const pool = upcoming.length ? upcoming : called;
  const spread = (g: PreviewGame) => Math.abs((g.prediction?.homeWinProb ?? 0.5) - 0.5);
  const closest = [...pool].sort((a, b) => spread(a) - spread(b))[0];
  const favourite = [...pool].sort((a, b) => spread(b) - spread(a))[0];
  const fav = (g: PreviewGame) => {
    const p = g.prediction!.homeWinProb;
    return p >= 0.5 ? `${clubAbbr(g.home.clubCode)} ${pct(p)}` : `${clubAbbr(g.away.clubCode)} ${pct(1 - p)}`;
  };
  const splits = called.flatMap((g) => {
    const k = picks(g);
    const notes: string[] = [];
    if (k.jev && k.ours && k.jev.clubCode !== k.ours.clubCode) notes.push(`Jev picks ${clubAbbr(k.jev.clubCode)}`);
    if (k.market && k.ours && k.market.clubCode !== k.ours.clubCode) notes.push(`the market favours ${clubAbbr(k.market.clubCode)}`);
    return notes.length ? [{ g, text: `${clubAbbr(g.home.clubCode)} v ${clubAbbr(g.away.clubCode)}: we pick ${clubAbbr(k.ours?.clubCode)}, ${notes.join(" and ")}` }] : [];
  });
  const graded = called.filter((g) => g.played);
  const record = (who: "ours" | "jev" | "market") => {
    let right = 0, total = 0;
    for (const g of graded) {
      const k = picks(g);
      const pick = k[who];
      if (!pick || k.homeWon === null) continue;
      total++;
      if (pick.clubCode === (k.homeWon ? g.home.clubCode : g.away.clubCode)) right++;
    }
    return total ? `${right}/${total}` : "–";
  };
  if (called.length === 0) return null;
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {graded.length > 0 ? (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-3 sm:col-span-3">
            <div className="text-xs uppercase text-neutral-500">Calls this round</div>
            <div className="text-sm text-neutral-300">
              {`Eurostepper ${record("ours")} · Jev ${record("jev")} · Polymarket ${record("market")}`}
              <span className="text-neutral-500">{` (${graded.length} of ${games.length} games played)`}</span>
            </div>
          </div>
        ) : null}
        {closest && (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-3">
            <div className="text-xs uppercase text-neutral-500">Closest game</div>
            <div className="font-semibold">{clubAbbr(closest.home.clubCode)} v {clubAbbr(closest.away.clubCode)}</div>
            <div className="text-xs text-neutral-400">{fav(closest)}</div>
          </div>
        )}
        {favourite && (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-3">
            <div className="text-xs uppercase text-neutral-500">Biggest favourite</div>
            <div className="font-semibold">{clubAbbr(favourite.home.clubCode)} v {clubAbbr(favourite.away.clubCode)}</div>
            <div className="text-xs text-neutral-400">{fav(favourite)}</div>
          </div>
        )}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-3">
          <div className="text-xs uppercase text-neutral-500">Disagreements</div>
          <div className="font-semibold">{splits.length === 0 ? "None" : `${splits.length} ${splits.length === 1 ? "game" : "games"}`}</div>
          <div className="text-xs text-neutral-400">Jev or the market pick a different winner</div>
        </div>
      </div>
      {splits.length > 0 && (
        <ul className="grid gap-1 text-sm text-neutral-300">
          {splits.map(({ g, text }) => (
            <li key={g.gameCode}>
              <Link href={`/games/${g.gameCode}`} className="hover:text-orange-400">{text}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function RoundPreviewPage({ params }: { params: Promise<{ round: string }> }) {
  const { round } = await params;
  const n = Number(round);
  if (!Number.isInteger(n) || n < 1) notFound();
  let data;
  try {
    data = await getRoundPreview(n, await currentSeason());
  } catch {
    notFound();
  }
  const played = data.games.filter((g) => g.played).length;
  const status = played === 0 ? "preview" : played === data.games.length ? "review" : "in progress";
  const first = data.games[0]?.utcDate ?? null;
  const last = data.games[data.games.length - 1]?.utcDate ?? null;
  const dates = first && last && day(first) !== day(last) ? `${day(first)} – ${day(last)}` : day(first);
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">
          {data.roundName ?? `Round ${n}`} {status === "review" ? "review" : "preview"}
        </h1>
        <nav className="flex gap-4 text-sm">
          {n > 1 && <Link href={`/rounds/${n - 1}`} className="text-orange-400 hover:underline">← Round {n - 1}</Link>}
          {data.totalRounds && n < data.totalRounds && (
            <Link href={`/rounds/${n + 1}`} className="text-orange-400 hover:underline">Round {n + 1} →</Link>
          )}
        </nav>
      </div>
      <p className="-mt-4 text-sm text-neutral-400">
        {`${data.seasonLabel} · ${dates} · `}
        {status === "preview"
          ? `${data.games.length} games`
          : status === "review"
            ? "all games played: our calls next to the results"
            : `${played} of ${data.games.length} games played`}
      </p>
      <Glance games={data.games} />
      <div className="grid gap-4 lg:grid-cols-2">
        {data.games.map((g) => (
          <GameCard key={g.gameCode} g={g} />
        ))}
      </div>
      <p className="text-xs text-neutral-500">
        {"Positions, records and form are from before the round"
          + (data.tableAfterRound ? ` (table after Round ${data.tableAfterRound})` : "")
          + ". Power ratings are from before each game once it has been played, otherwise the current ones. "
          + "Our call, Jev's and the market price are taken before tip-off and locked there. "
          + (data.injuriesSource ? `Absences come from ${data.injuriesSource}'s injury list` : "")
          + (data.injuriesUpdated ? `, updated ${day(`${data.injuriesUpdated}Z`)}.` : data.injuriesSource ? "." : "")}
      </p>
    </div>
  );
}
