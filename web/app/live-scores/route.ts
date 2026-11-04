import { API_URL } from "@/lib/api";

// Live scores for the browser, polled every 30 seconds by components/LiveScores.tsx
// while games are on. The data service isn't public, so this passes its
// /api/live through.
export async function GET(request: Request) {
  // ?game=N&season=E2026 adds that game's live box score and win probability
  const incoming = new URL(request.url).searchParams;
  const params = new URLSearchParams();
  for (const key of ["game", "season"]) {
    const value = incoming.get(key);
    if (value && /^[A-Za-z0-9]+$/.test(value)) params.set(key, value);
  }
  const query = params.toString() ? `?${params}` : "";
  try {
    const res = await fetch(`${API_URL}/api/live${query}`, { cache: "no-store" });
    if (!res.ok) return Response.json({ games: [], active: false }, { status: 502 });
    return Response.json(await res.json(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ games: [], active: false }, { status: 502 });
  }
}
