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

export function getStandings(round?: number) {
  const qs = round ? `?round=${round}` : "";
  return get<{ season: string; round: number; standings: StandingRow[] }>(
    `/api/standings${qs}`,
  );
}

export function getGames(params?: { round?: number; club?: string }) {
  const qs = new URLSearchParams();
  if (params?.round !== undefined) qs.set("round", String(params.round));
  if (params?.club) qs.set("club", params.club);
  const suffix = qs.size ? `?${qs}` : "";
  return get<{ season: string; games: Game[] }>(`/api/games${suffix}`);
}

export type ClubWithRecord = ClubSummary & {
  position: number | null;
  record: string | null;
};

export function getClubs() {
  return get<{ clubs: ClubWithRecord[] }>(`/api/clubs`);
}

export type PlayerSummary = {
  playerCode: string;
  name: string;
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

export function getGame(gameCode: number) {
  return get<GameDetail>(`/api/games/${gameCode}`);
}

export function getPlayers() {
  return get<{ season: string; minGames: number; players: PlayerSummary[] }>(
    `/api/players`,
  );
}

export function getPlayer(code: string) {
  return get<PlayerDetail>(`/api/players/${code}`);
}

export function getPlayerShots(code: string) {
  return get<{ season: string; total: number; shots: ShotPoint[] }>(
    `/api/players/${code}/shots`,
  );
}

export function getClubShots(code: string) {
  return get<{ season: string; total: number; shots: ShotPoint[] }>(
    `/api/clubs/${code}/shots`,
  );
}

export type TeamSeasonStats = {
  gamesPlayed: number;
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

export function getClub(code: string) {
  return get<{
    club: ClubSummary;
    stats: TeamSeasonStats | null;
    coaches: CoachEntry[];
    roster: RosterEntry[];
    games: Game[];
  }>(`/api/clubs/${code}`);
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

export function getHighs() {
  return get<{
    season: string;
    categories: { key: string; label: string; entries: HighEntry[] }[];
  }>(`/api/highs`);
}

export type AwardEntry = {
  award: string;
  playerCode: string;
  name: string | null;
  clubCode: string | null;
  clubName: string | null;
  crestUrl: string | null;
};

export function getAwards() {
  return get<{ season: string; awards: AwardEntry[] }>(`/api/awards`);
}

export type SearchResults = {
  clubs: ClubSummary[];
  players: {
    playerCode: string;
    name: string;
    clubCode: string | null;
    clubName: string | null;
  }[];
};
