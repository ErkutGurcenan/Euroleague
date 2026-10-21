export type NavLink = { href: string; label: string; description?: string };
export type NavGroup = { title: string; links: NavLink[] };
export type NavItem = NavLink | { label: string; groups: NavGroup[] };

export const NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/standings", label: "Standings" },
  { href: "/games", label: "Games" },
  { href: "/predictions", label: "Predictions" },
  { href: "/teams", label: "Teams" },
  { href: "/players", label: "Players" },
  { href: "/injuries", label: "Injuries" },
  {
    label: "Leaders",
    groups: [
      {
        title: "This season",
        links: [
          { href: "/rankings", label: "Power rankings", description: "How strong each team is right now" },
          { href: "/highs", label: "Season highs", description: "Best single-game performances" },
          { href: "/shooting", label: "Shooting", description: "True shooting, eFG% and splits" },
          { href: "/notable", label: "Notable games", description: "Comebacks, blowouts, thrillers" },
          { href: "/lineups", label: "Best lineups", description: "Top five-, three- and two-man groups" },
          { href: "/impact", label: "Player impact", description: "On/off swing for every player" },
          { href: "/referees", label: "Referees", description: "How games are officiated" },
        ],
      },
      {
        title: "All-time",
        links: [
          { href: "/all-time", label: "All-time leaders", description: "Career totals since 2016-17" },
          { href: "/honor", label: "Honor roll", description: "MVPs and season award winners" },
          { href: "/champions", label: "Champions", description: "Title winners since 2016-17" },
        ],
      },
    ],
  },
  { href: "/compare", label: "Compare" },
];

/** Extra paths that belong to a top-level link (tabs living at their own URL). */
const ALIASES: Record<string, string[]> = {
  "/players": ["/fantasy"],
};

export function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return [href, ...(ALIASES[href] ?? [])].some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
