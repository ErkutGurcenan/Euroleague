import { API_URL } from "@/lib/api";

// Live scores for the browser, polled every 30 seconds by components/LiveScores.tsx
// while games are on. The data service isn't public, so this passes its
// /api/live through.
export async function GET() {
  try {
    const res = await fetch(`${API_URL}/api/live`, { cache: "no-store" });
    if (!res.ok) return Response.json({ games: [], active: false }, { status: 502 });
    return Response.json(await res.json(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ games: [], active: false }, { status: 502 });
  }
}
