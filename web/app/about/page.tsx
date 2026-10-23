export const metadata = {
  title: "About",
  description:
    "Eurostepper is an independent EuroLeague stats and analytics site: box scores, shot charts, play-by-play and history since 2016-17.",
};

import Link from "next/link";
import Logo from "@/components/Logo";
import { getMeta } from "@/lib/api";

const GITHUB_REPO = "https://github.com/ErkutGurcenan/Euroleague";
const GITHUB_PROFILE = "https://github.com/ErkutGurcenan";
const ORACLENBA = "https://oraclenba.com";
const INJURY_LIST = "https://basketballsphere.com/en/injuries/euroleague/";

const SECTIONS = [
  { href: "/standings", title: "Standings & games", text: "Tables round by round, results, box scores and shot charts for every game." },
  { href: "/players", title: "Players", text: "Per-game stats, shooting efficiency, PIR-based fantasy analysis and career pages." },
  { href: "/teams", title: "Teams", text: "Rosters, season stats, shot profiles and franchise history." },
  { href: "/highs", title: "Leaders", text: "Season highs, notable games, referees, all-time leaders and the honor roll." },
  { href: "/injuries", title: "Injuries", text: "Who's out, also shown on team pages and match previews." },
  { href: "/compare", title: "Compare", text: "Players and teams side by side, with all-time head-to-head records." },
];

function compact(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n.toLocaleString("en-GB");
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-3 text-center">
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">
      {children}
    </a>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default async function AboutPage() {
  const meta = await getMeta().catch(() => null);
  const lastGame = meta?.lastGame
    ? new Date(meta.lastGame).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Logo size={40} />
        <h1 className="text-2xl font-bold">About Eurostepper</h1>
      </div>

      <p className="mb-4 text-neutral-300">
        Eurostepper is an independent EuroLeague stats and analytics site. It
        brings box scores, shot charts, play-by-play numbers and history from
        every season since {meta?.firstSeason ?? "2016-17"} into one place:
        the kind of depth NBA fans take for granted, built for European
        basketball.
      </p>
      <p className="mb-8 text-neutral-300">
        Beyond the raw numbers it adds its own analysis, such as true
        shooting, PIR consistency for fantasy players, recent form,
        all-time head-to-head records and franchise histories.
      </p>

      {meta && (
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat value={String(meta.seasons)} label="seasons" />
          <Stat value={compact(meta.games)} label="games" />
          <Stat value={compact(meta.players)} label="players" />
          <Stat value={compact(meta.shots)} label="shots charted" />
          <Stat value={compact(meta.playByPlayEvents)} label="play-by-play events" />
        </div>
      )}

      <Section title="What you'll find">
        <div className="grid gap-3 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-3 transition-colors hover:border-orange-600/50"
            >
              <div className="font-semibold">{s.title}</div>
              <div className="text-sm text-neutral-400">{s.text}</div>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Where the data comes from">
        <ul className="list-disc space-y-2 pl-5 text-neutral-300">
          <li>
            <span className="font-medium text-neutral-100">Official EuroLeague data</span>{" "}
            for games, box scores, shot locations, play-by-play and rosters. It
            is loaded into Eurostepper&apos;s own database and refreshed every
            night{lastGame ? ` (latest game: ${lastGame})` : ""}.
          </li>
          <li>
            <span className="font-medium text-neutral-100">Injury list</span>{" "}
            from <ExternalLink href={INJURY_LIST}>BasketballSphere</ExternalLink>
            {"'s EuroLeague injury page, checked three times a day and credited wherever it's shown."}
          </li>
          <li>
            <span className="font-medium text-neutral-100">Season awards</span>{" "}
            entered from the official announcements.
          </li>
          <li>
            <span className="font-medium text-neutral-100">Everything derived</span>{" "}
            (advanced shooting, fantasy metrics, form, records, histories) is
            calculated by Eurostepper from that data.
          </li>
        </ul>
      </Section>

      <Section title="How it's built">
        <p className="mb-3 text-neutral-300">
          A Python ingestion pipeline pulls the official data into a SQL
          database, a FastAPI service serves it, and the site is built with
          Next.js, TypeScript and Tailwind CSS. It runs on AWS behind Caddy,
          with a nightly data refresh and weekly backups.
        </p>
        <p className="text-neutral-300">
          The source code is on{" "}
          <ExternalLink href={GITHUB_REPO}>GitHub</ExternalLink>.
        </p>
      </Section>

      <Section title="Who built it">
        <p className="text-neutral-300">
          Eurostepper is built by{" "}
          <ExternalLink href={GITHUB_PROFILE}>Erkut Gurcenan</ExternalLink>,
          who has played basketball and followed the game closely for years,
          and is interested in sports analytics. Erkut previously built{" "}
          <ExternalLink href={ORACLENBA}>oraclenba</ExternalLink>, an NBA
          game-prediction project.
        </p>
      </Section>

      <Section title="What's next">
        <ul className="list-disc space-y-2 pl-5 text-neutral-300">
          <li>Lineup analysis: which five-player combinations work best, from play-by-play data.</li>
          <li>Game predictions, built and backtested on every season in the database.</li>
        </ul>
      </Section>

      <p className="border-t border-neutral-800 pt-4 text-xs text-neutral-500">
        Eurostepper is an unofficial fan project and is not affiliated with or
        endorsed by Euroleague Basketball. Club names, logos and player photos
        belong to their respective owners.
      </p>
    </div>
  );
}
