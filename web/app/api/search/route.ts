import { NextRequest } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

// Proxy to the backend: the browser can only reach the Next server
// (e.g. through an SSH tunnel to port 3000), not the API port directly.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return Response.json({ clubs: [], players: [] });
  }
  const res = await fetch(
    `${API_URL}/api/search?q=${encodeURIComponent(q.trim())}`,
  );
  if (!res.ok) {
    return Response.json({ clubs: [], players: [] }, { status: 502 });
  }
  return Response.json(await res.json());
}
