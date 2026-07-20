import { cookies } from "next/headers";

const SEASON_RE = /^E20\d{2}$/;

/** The user's selected season from the cookie, or undefined for the
    API's default (latest) season. */
export async function currentSeason(): Promise<string | undefined> {
  const value = (await cookies()).get("season")?.value;
  return value && SEASON_RE.test(value) ? value : undefined;
}

export function seasonLabel(code: string): string {
  const year = Number(code.slice(1));
  return Number.isFinite(year) ? `${year}-${String(year + 1).slice(-2)}` : code;
}
