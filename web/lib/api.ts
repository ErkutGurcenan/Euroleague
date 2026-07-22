const API_URL = process.env.API_URL ?? "http://localhost:8000";

export type ClubSummary = {
  code: string;
  name: string;
  abbreviatedName: string | null;
  country: string | null;
  city: string | null;
  crestUrl: string | null;
  website: string | null;
};

export type StandingRow = {
  position: number;
  club: ClubSummary;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  pointsFavour: number;
  pointsAgainst: number;
  pointsDiff: number;
  qualified: boolean | null;
  home: string;
  away: string;
  form: ("W" | "L")[];
};

export type GameSide = {
  code: string | null;
  name: string | null;
  crestUrl: string | null;
  score: number | null;
};

export type Game = {
  id: string;
  gameCode: number;
  round: number | null;
  roundName: string | null;
  phaseType: string | null;
  groupName: string | null;
  played: boolean;
  utcDate: string | null;
  home: GameSide;
  away: GameSide;
};

export type RosterEntry = {
  personCode: string;
  name: string | null;
  dorsal: string | null;
  positionName: string | null;
  heightCm: number | null;
  birthDate: string | null;
  country: string | null;
  active: boolean | null;
  gamesPlayed: number;
  minutes: number | null;
  points: number | null;
  rebounds: number | null;
  assists: number | null;
  pir: number | null;
};

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`);
  }
  return res.json();
}

function qs(params: Record<string, string | number | undefined | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export type SeasonInfo = { code: string; label: string; note: string | null };

export function getSeasons() {
  return get<{ seasons: SeasonInfo[]; default: string }>(`/api/seasons`);
}

export function getStandings(round?: number, season?: string) {
  return get<{ season: string; round: number; standings: StandingRow[] }>(
    `/api/standings${qs({ round, season })}`,
  );
}

export type StandingsHistoryClub = {
  club: ClubSummary;
  rounds: { round: number; position: number | null }[];
};

export function getStandingsHistory(season?: string) {
  return get<{ season: string; clubs: StandingsHistoryClub[] }>(
    `/api/standings/history${qs({ season })}`,
  );
}

export function getGames(season?: string) {
  return get<{ season: string; games: Game[] }>(`/api/games${qs({ season })}`);
}

export type ClubWithRecord = ClubSummary & {
  position: number | null;
  record: string | null;
};

export function getClubs(season?: string) {
  return get<{ clubs: ClubWithRecord[] }>(`/api/clubs${qs({ season })}`);
}

export type PlayerSummary = {
  playerCode: string;
  name: string;
  imageUrl: string | null;
  position: string | null;
  club: ClubSummary | null;
  gamesPlayed: number;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  turnovers: number;
  blocks: number;
  pir: number;
  fg2Pct: number | null;
  fg3Pct: number | null;
  ftPct: number | null;
};

export type GameLogEntry = {
  won: boolean | null;
  gameCode: number;
  round: number | null;
  utcDate: string | null;
  home: boolean | null;
  opponent: ClubSummary | null;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  pir: number;
  plusMinus: number | null;
  fg2: string;
  fg3: string;
  ft: string;
};

export type PlayerDetail = {
  playerCode: string;
  name: string;
  club: ClubSummary | null;
  dorsal: string | null;
  positionName: string | null;
  heightCm: number | null;
  birthDate: string | null;
  country: string | null;
  imageUrl: string | null;
  averages: {
    gamesPlayed: number;
    minutes: number;
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    pir: number;
    fg2Pct: number | null;
    fg3Pct: number | null;
    ftPct: number | null;
  };
  gameLog: GameLogEntry[];
};

export type ShotPoint = {
  x: number;
  y: number;
  made: boolean;
  three: boolean;
  zone: string | null;
  fastbreak: boolean;
  gameCode: number;
  home: boolean | null;
  won: boolean | null;
};

export type BoxScoreLine = {
  playerCode: string;
  name: string | null;
  dorsal: string | null;
  isStarter: boolean;
  minutes: number;
  points: number;
  fg2: string;
  fg3: string;
  ft: string;
  oreb: number;
  dreb: number;
  rebounds: number;
  assists: number;
  steals: number;
  turnovers: number;
  blocks: number;
  fouls: number;
  pir: number;
  plusMinus: number | null;
};

export type TeamTotals = {
  points: number;
  fg2m: number; fg2a: number;
  fg3m: number; fg3a: number;
  ftm: number; fta: number;
  fg2Pct: number | null;
  fg3Pct: number | null;
  ftPct: number | null;
  oreb: number; dreb: number; rebounds: number;
  assists: number; steals: number;
  turnovers: number; blocks: number;
  fouls: number; pir: number;
};

export type GameDetailSide = {
  club: ClubSummary | null;
  score: number | null;
  quarters: (number | null)[];
  overtime: number | null;
  players: BoxScoreLine[];
  totals: TeamTotals;
  shots: ShotPoint[];
};

export type GameDetail = {
  season: string;
  gameCode: number;
  headToHead: Game[];
  round: number | null;
  roundName: string | null;
  phaseType: string | null;
  groupName: string | null;
  played: boolean;
  utcDate: string | null;
  home: GameDetailSide;
  away: GameDetailSide;
};

export function getGame(gameCode: number, season?: string) {
  return get<GameDetail>(`/api/games/${gameCode}${qs({ season })}`);
}

export function getPlayers(season?: string) {
  return get<{ season: string; minGames: number; players: PlayerSummary[] }>(
    `/api/players${qs({ season })}`,
  );
}

export function getPlayer(code: string, season?: string) {
  return get<PlayerDetail>(`/api/players/${code}${qs({ season })}`);
}

export type CareerSeason = {
  season: string;
  seasonLabel: string;
  clubCode: string | null;
  clubName: string | null;
  crestUrl: string | null;
  gamesPlayed: number;
  minutes: number | null;
  points: number | null;
  rebounds: number | null;
  assists: number | null;
  pir: number | null;
  fg2Pct: number | null;
  fg3Pct: number | null;
  ftPct: number | null;
};

export type PlayerCareer = {
  playerCode: string;
  name: string;
  positionName: string | null;
  imageUrl: string | null;
  seasonsPlayed: number;
  awards: { season: string; seasonLabel: string; award: string }[];
  seasons: CareerSeason[];
  career: Omit<CareerSeason, "season" | "seasonLabel" | "clubCode" | "clubName" | "crestUrl">;
};

export function getPlayerCareer(code: string) {
  return get<PlayerCareer>(`/api/players/${code}/career`);
}

export function getPlayerShots(code: string, season?: string) {
  return get<{ season: string; total: number; shots: ShotPoint[] }>(
    `/api/players/${code}/shots${qs({ season })}`,
  );
}

export function getClubShots(code: string, season?: string) {
  return get<{ season: string; total: number; shots: ShotPoint[] }>(
    `/api/clubs/${code}/shots${qs({ season })}`,
  );
}

export type QuarterProfile = {
  quarter: number;
  for: number | null;
  against: number | null;
  net: number | null;
};

export type TeamSeasonStats = {
  gamesPlayed: number;
  quarters: QuarterProfile[];
  wins: number;
  losses: number;
  points: number;
  opponentPoints: number | null;
  rebounds: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  assists: number;
  steals: number;
  turnovers: number;
  blocks: number;
  pir: number;
  fg2Pct: number | null;
  fg3Pct: number | null;
  ftPct: number | null;
};

export type CoachEntry = {
  name: string | null;
  role: string;
  active: boolean | null;
};

export function getClub(code: string, season?: string) {
  return get<{
    club: ClubSummary;
    stats: TeamSeasonStats | null;
    coaches: CoachEntry[];
    roster: RosterEntry[];
    games: Game[];
  }>(`/api/clubs/${code}${qs({ season })}`);
}

export type HighEntry = {
  playerCode: string;
  name: string | null;
  clubCode: string | null;
  value: number;
  gameCode: number;
  round: number | null;
  opponent: string | null;
  utcDate: string | null;
};

export function getHighs(season?: string) {
  return get<{
    season: string;
    categories: { key: string; label: string; entries: HighEntry[] }[];
  }>(`/api/highs${qs({ season })}`);
}

export type NotableEntry = {
  game: Game;
  value: number;
  note: string | null;
};

export function getNotableGames(season?: string) {
  return get<{
    season: string;
    categories: { key: string; label: string; entries: NotableEntry[] }[];
  }>(`/api/games/notable${qs({ season })}`);
}

export type RoundMvp = {
  playerCode: string;
  name: string | null;
  imageUrl: string | null;
  clubCode: string | null;
  clubName: string | null;
  gameCode: number;
  opponent: string | null;
  points: number;
  rebounds: number;
  assists: number;
  pir: number;
};

export function getRoundMvp(round: number, season?: string) {
  return get<RoundMvp>(`/api/rounds/${round}/mvp${qs({ season })}`);
}

export type TransferEntry = {
  playerCode: string;
  name: string | null;
  imageUrl: string | null;
  from: { code: string; name: string; crestUrl: string | null } | null;
  to: { code: string; name: string; crestUrl: string | null } | null;
  date: string | null;
};

export function getTransfers(season?: string) {
  return get<{ season: string; transfers: TransferEntry[] }>(
    `/api/transfers${qs({ season })}`,
  );
}

export type AwardEntry = {
  award: string;
  playerCode: string;
  name: string | null;
  clubCode: string | null;
  clubName: string | null;
  crestUrl: string | null;
};

export function getAwards(season?: string) {
  return get<{ season: string; awards: AwardEntry[] }>(
    `/api/awards${qs({ season })}`,
  );
}

export type AllTimeEntry = {
  playerCode: string;
  name: string | null;
  imageUrl: string | null;
  clubCode: string | null;
  clubCrest: string | null;
  seasonsPlayed: number;
  games: number;
  value: number;
};

export type AllTimeCategory = {
  key: string;
  label: string;
  unit: string;
  rate: boolean;
  entries: AllTimeEntry[];
};

export function getAllTimeLeaders() {
  return get<{
    minGames: number;
    totals: AllTimeCategory[];
    averages: AllTimeCategory[];
  }>(`/api/leaderboards/alltime`);
}

export type ChampionClub = {
  code: string;
  name: string;
  crestUrl: string | null;
  titles: number;
};

export type FinalEntry = {
  season: string;
  seasonLabel: string;
  gameCode: number;
  champion: { code: string; name: string; crestUrl: string | null };
  runnerUp: { code: string; name: string; crestUrl: string | null };
  championScore: number;
  runnerUpScore: number;
  finalFourMvp: { playerCode: string; name: string | null } | null;
};

export function getChampions() {
  return get<{
    titlesByClub: ChampionClub[];
    finals: FinalEntry[];
    canceled: { season: string; seasonLabel: string; note: string }[];
  }>(`/api/champions`);
}

export type HonorAward = {
  playerCode: string;
  name: string | null;
  imageUrl: string | null;
  clubCode: string | null;
  clubCrest: string | null;
} | null;

export type HonorSeason = {
  season: string;
  seasonLabel: string;
  canceled: boolean;
  note: string | null;
  champion: { code: string; name: string; crestUrl: string | null } | null;
  awards: Record<string, HonorAward>;
};

export function getHonorRoll() {
  return get<{ awardTypes: string[]; seasons: HonorSeason[] }>(`/api/honor`);
}

export type SearchResults = {
  clubs: ClubSummary[];
  players: {
    playerCode: string;
    name: string;
    imageUrl: string | null;
    clubCode: string | null;
    clubName: string | null;
  }[];
};
