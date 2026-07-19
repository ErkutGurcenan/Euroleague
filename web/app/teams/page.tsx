import Link from "next/link";
import { getClubs } from "@/lib/api";

export default async function TeamsPage() {
  const { clubs } = await getClubs();
  const realClubs = clubs.filter((c) => c.country); // skip Final Four placeholders

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Teams</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {realClubs.map((club) => (
          <Link
            key={club.code}
            href={`/teams/${club.code}`}
            className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-3 transition-colors hover:border-orange-600/50 hover:bg-neutral-900"
          >
            {club.crestUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={club.crestUrl}
                alt=""
                className="h-10 w-10 object-contain"
              />
            )}
            <div className="min-w-0">
              <div className="truncate font-medium">{club.name}</div>
              <div className="text-xs text-neutral-500">
                {club.city ? `${club.city}, ` : ""}
                {club.country}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
