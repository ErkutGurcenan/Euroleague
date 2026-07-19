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
};

export type GameSide = {
  code: string | null;
  name: string | null;
  crestUrl: string | null;
  score: number | null;
};

export type Game = {
  id: string;
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

export function getClubs() {
  return get<{ clubs: ClubSummary[] }>(`/api/clubs`);
}

export function getClub(code: string) {
  return get<{ club: ClubSummary; roster: RosterEntry[]; games: Game[] }>(
    `/api/clubs/${code}`,
  );
}
