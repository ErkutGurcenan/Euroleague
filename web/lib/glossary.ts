/** Plain-words explanations of the numbers and terms used on the site. The
    Guide page (/guide) lists them all; keep each `short` to a sentence or two
    so it can also be shown next to the number it explains. Wording follows
    how the API and pages actually calculate each figure. */

export type GlossaryTerm = {
  /** Anchor on the Guide page (/guide#id). */
  id: string;
  /** How the site labels it, e.g. "PIR". */
  label: string;
  /** Full name, when the label is short for something. */
  name?: string;
  short: string;
  /** Extra detail, shown on the Guide page only. */
  more?: string;
};

export type GlossarySection = {
  id: string;
  title: string;
  /** Pages where these numbers appear. */
  links: { href: string; label: string }[];
  terms: GlossaryTerm[];
};

export const GLOSSARY: GlossarySection[] = [
  {
    id: "box-score",
    title: "Box score",
    links: [{ href: "/games", label: "Games" }, { href: "/players", label: "Players" }],
    terms: [
      { id: "min", label: "Min", name: "Minutes", short: "Minutes played." },
      { id: "pts", label: "Pts", name: "Points", short: "Points scored." },
      {
        id: "shots",
        label: "2P · 3P · FT",
        name: "Two-pointers, three-pointers, free throws",
        short: "Shots made out of shots taken: 5/8 means 5 made from 8 tries. 2P%, 3P% and FT% are the share made.",
      },
      { id: "reb", label: "Reb", name: "Rebounds", short: "Missed shots grabbed, at either end of the court." },
      { id: "ast", label: "Ast", name: "Assists", short: "Passes that lead straight to a basket." },
      { id: "stl", label: "Stl", name: "Steals", short: "Taking the ball off the other team." },
      { id: "blk", label: "Blk", name: "Blocks", short: "Opponents' shots knocked away." },
      {
        id: "to",
        label: "To",
        name: "Turnovers",
        short: "Losing the ball without getting a shot off: a bad pass, a travel, an offensive foul and so on.",
      },
      {
        id: "plus-minus",
        label: "+/−",
        name: "Plus-minus",
        short: "The score difference while the player was on court: +6 means the team outscored its opponent by 6 points in those minutes.",
      },
      {
        id: "pir",
        label: "PIR",
        name: "Performance Index Rating",
        short: "EuroLeague's official all-in-one score: the good things a player does minus the bad ones. EuroLeague Fantasy scores on it too.",
        more: "Points, rebounds, assists, steals, blocks and fouls drawn, minus missed shots, missed free throws, turnovers, shots that got blocked and fouls committed.",
      },
      { id: "gp", label: "GP", name: "Games played", short: "Games the player has appeared in." },
      { id: "home-away", label: "vs · @", short: "In game logs, vs is a home game and @ an away game." },
      { id: "ot", label: "OT", name: "Overtime", short: "Five extra minutes, played when the score is level after 40." },
    ],
  },
  {
    id: "shooting",
    title: "Shooting",
    links: [{ href: "/shooting", label: "Shooting" }],
    terms: [
      {
        id: "ts",
        label: "TS%",
        name: "True shooting",
        short: "Points per shot, counting two-pointers, three-pointers and free throws: the fairest single measure of how efficiently someone scores.",
        more: "Points ÷ (2 × (shots + 0.44 × free-throw attempts)). The 0.44 is there because free throws mostly come in pairs, so two of them use up about one chance to score.",
      },
      {
        id: "efg",
        label: "eFG%",
        name: "Effective field goal %",
        short: "Shooting percentage with a made three counted as one and a half baskets, since it's worth 50% more.",
        more: "(Made shots + half the made threes) ÷ shots taken. Free throws aren't included; true shooting adds them.",
      },
      {
        id: "attempts",
        label: "FGA · 2PA · 3PA · FTA",
        name: "Attempts",
        short: "Shots taken: all field goals (twos and threes), two-pointers, three-pointers and free throws.",
      },
      {
        id: "qualified",
        label: "Qualified players",
        short: "Shooting leaders need a minimum number of attempts, shown on each list. It grows as the season goes on, so a few hot nights can't top the table.",
      },
    ],
  },
  {
    id: "team-strength",
    title: "Team strength and season odds",
    links: [{ href: "/rankings", label: "Power rankings" }, { href: "/standings", label: "Standings" }],
    terms: [
      {
        id: "rating",
        label: "Rating",
        name: "Power rating",
        short: "How strong a team is right now, as an Elo rating: 1500 is average, and home court is worth about 100 points.",
        more: "It's updated after every game since 2016-17, and beating a strong team or winning big moves it more. Every summer ratings move 30% back toward average; new clubs start just below it.",
      },
      { id: "vs-avg", label: "vs avg", short: "The chance of beating an average EuroLeague team on a neutral court." },
      {
        id: "rating-change",
        label: "Last game · Season",
        short: "How much the rating moved in the latest game, and since the season began.",
      },
      { id: "trend", label: "Trend", short: "The rating over the last ten games: green if it went up, red if it went down." },
      { id: "form", label: "Form", short: "Results of the last five games." },
      {
        id: "top-6",
        label: "Top 6 · Play-in",
        short: "Teams finishing 1st–6th go straight to the playoffs. 7th–10th play the play-in for the last two playoff places.",
      },
      {
        id: "season-odds",
        label: "Season odds",
        short: "Each team's chance of finishing 1st, making the top 6, the play-in, the playoffs and the Final Four, and of winning the title.",
        more: "The rest of the regular season, the play-in, the best-of-five playoffs and the Final Four are played out thousands of times with the current power ratings; the odds are how often each thing happened. Updated every night.",
      },
      { id: "projected", label: "Projected", short: "The average final win–loss record across those simulated seasons." },
    ],
  },
  {
    id: "impact",
    title: "Player impact and lineups",
    links: [{ href: "/impact", label: "Player impact" }, { href: "/lineups", label: "Best lineups" }],
    terms: [
      {
        id: "per-100",
        label: "Per 100 possessions",
        short: "A possession is one team's turn with the ball (Poss counts them). Measuring per 100 possessions makes fast and slow teams, and long and short spells on court, comparable.",
        more: "Possessions are estimated from the play-by-play: shots, free throws, offensive rebounds and turnovers.",
      },
      {
        id: "net-rating",
        label: "Off · Def · Net",
        name: "Net rating",
        short: "Points scored (Off) and allowed (Def) per 100 possessions. Net is the difference: +5 means outscoring opponents by 5 points every 100 possessions, and 0 is league average.",
      },
      {
        id: "swing",
        label: "On/off swing",
        short: "How much better or worse the team did per 100 possessions with the player on court than on the bench, in games the player played.",
        more: "It depends on teammates and opponents: starters often face the other team's best players, and a strong bench lifts the off-court numbers.",
      },
      {
        id: "adjusted-impact",
        label: "Adjusted impact",
        short: "The points per 100 possessions a player adds compared with an average EuroLeague player, after accounting for every teammate and opponent on court with them. Split into offence and defence.",
        more: "It's fitted on every stint of the season (a spell with the same ten players on court), starting from the player's earlier seasons. The range (±) shows how sure the estimate is: the true value is 90% likely to be inside it.",
      },
      {
        id: "lineup",
        label: "Lineup",
        short: "A group of players on court together. Best lineups ranks five-, three- and two-man groups by net rating.",
      },
      { id: "small-sample", label: "Small sample", short: "Not many minutes yet, so the number can still swing a lot. Read with care." },
    ],
  },
  {
    id: "fantasy",
    title: "Fantasy",
    links: [{ href: "/fantasy", label: "Fantasy" }],
    terms: [
      { id: "pir-min", label: "PIR/min", short: "PIR per minute played: who produces most in the time they get." },
      {
        id: "range",
        label: "Range",
        short: "A player's typical game: average PIR plus or minus one standard deviation. The bar is the range; the tick is the average.",
      },
      {
        id: "var",
        label: "Var.",
        name: "Variation",
        short: "How much PIR swings from game to game (the spread divided by the average). Lower means steadier.",
      },
      { id: "last-3", label: "Last 3", short: "Average PIR over the last three games." },
      { id: "vs-ly", label: "vs LY", name: "vs last year", short: "Change in average PIR from last season (players with 10+ games then)." },
      {
        id: "watch-list",
        label: "Watch list",
        short: "Players whose numbers are on the move. These are trends, not predictions, and early in the season they rest on few games.",
      },
    ],
  },
  {
    id: "predictions",
    title: "Predictions and markets",
    links: [{ href: "/predictions", label: "Predictions" }],
    terms: [
      {
        id: "win-chance",
        label: "Win chance",
        short: "Our model's chance that each team wins. It combines power ratings, season efficiency (net rating) and home court, is updated every night and is locked at tip-off.",
      },
      {
        id: "margin",
        label: "Expected margin",
        short: "How many points the model expects the favourite to win by. Under half a point, the game is called a toss-up.",
      },
      { id: "ratings-alone", label: "Ratings alone", short: "What the power ratings by themselves would say, as a yardstick for the full model." },
      {
        id: "backtest",
        label: "Backtest",
        short: "How the model would have done in past seasons, each season predicted using only the seasons before it.",
      },
      { id: "track-record", label: "Track record", short: "Real calls, saved before tip-off and graded after the game." },
      {
        id: "calibration",
        label: "Calibration",
        short: "Whether the percentages can be taken at face value: when the model says 70%, does the favourite win about 70% of the time?",
      },
      {
        id: "log-loss",
        label: "Log loss",
        short: "A score for how well-judged the chances were: confident right calls score well, confident misses cost a lot. Lower is better; always saying 50–50 scores 0.693.",
        more: "Chances are capped at 1% and 99% so one certain miss can't dominate.",
      },
      {
        id: "brier",
        label: "Brier score",
        short: "Another score for well-judged chances: the average squared gap between the chance given and what happened (100% or 0%). Lower is better; always saying 50–50 scores 0.250.",
      },
      {
        id: "jev",
        label: "Jev AI",
        short: "TypeSafe's decision model, as a second opinion. Before each game it gets the same kind of facts our model uses, but never our prediction, and gives the home team's chance of winning.",
      },
      {
        id: "polymarket",
        label: "Polymarket",
        short: "A prediction market where a share in the winning team pays $1, so a price of 77¢ means traders give that team about a 77% chance.",
        more: "Prices are saved every 15 minutes until tip-off. Games are graded at the last one, midway between the bid and the ask.",
      },
      {
        id: "spread",
        label: "Bid · Ask · Spread",
        short: "The bid is the best price a buyer offers right now, the ask the cheapest a seller accepts, and the spread is the gap. A spread over 10¢ means the market is too thin to trade.",
      },
      {
        id: "paper-trading",
        label: "Paper trading",
        short: "Pretend trades on Polymarket's prices with no real money, to test whether the models could make a profit. Not betting advice.",
      },
      {
        id: "value-rule",
        label: "Value rule",
        short: "Buys the side the model rates higher than the market does: home if the model gives the home team a better chance than the price, away if worse.",
      },
      { id: "pick-rule", label: "Pick rule", short: "Simply backs the team the model thinks will win." },
      { id: "return", label: "Return", short: "Profit or loss as a share of everything spent on trades, fees included." },
      {
        id: "fees",
        label: "Fees",
        short: "Polymarket charges buyers 5% × price × (1 − price) a share: most on even games, least on heavy favourites.",
      },
    ],
  },
  {
    id: "referees-records",
    title: "Referees and records",
    links: [{ href: "/referees", label: "Referees" }, { href: "/notable", label: "Notable games" }],
    terms: [
      {
        id: "home-win",
        label: "Home win %",
        short: "How often the home team won in games the referee worked. Each game has three referees and counts once for each.",
      },
      { id: "avg-points", label: "Avg points", short: "Points per game, both teams together." },
      { id: "fouls-per-game", label: "Fouls/gm", short: "Fouls called per game." },
      {
        id: "comeback",
        label: "Comeback",
        short: "The winner's biggest deficit at any point in the game, from the play-by-play running score.",
      },
    ],
  },
];

/** Every term by id, for showing one next to its number. */
export const TERMS: Record<string, GlossaryTerm> = Object.fromEntries(
  GLOSSARY.flatMap((s) => s.terms.map((t) => [t.id, t])),
);
