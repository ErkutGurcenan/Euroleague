"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function TeamFilterSelect({
  teams,
  current,
}: {
  teams: { code: string; name: string }[];
  current: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("team", value);
    else params.delete("team");
    router.push(`/players?${params.toString()}`);
  };

  return (
    <select
      value={current ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-300 outline-none focus:border-orange-600"
      aria-label="Filter by team"
    >
      <option value="">All teams</option>
      {teams.map((t) => (
        <option key={t.code} value={t.code}>
          {t.name}
        </option>
      ))}
    </select>
  );
}
