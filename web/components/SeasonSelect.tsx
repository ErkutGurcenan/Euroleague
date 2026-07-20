"use client";

import { useRouter } from "next/navigation";
import type { SeasonInfo } from "@/lib/api";

export default function SeasonSelect({
  seasons,
  current,
}: {
  seasons: SeasonInfo[];
  current: string;
}) {
  const router = useRouter();

  const onChange = (code: string) => {
    document.cookie = `season=${code}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  if (seasons.length <= 1) {
    return (
      <span className="text-xs text-neutral-500">
        {seasons[0]?.label ?? ""}
      </span>
    );
  }
  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-neutral-700 bg-neutral-900 px-1.5 py-1 text-xs text-neutral-300 outline-none focus:border-orange-600"
      aria-label="Season"
    >
      {seasons.map((s) => (
        <option key={s.code} value={s.code}>
          {s.label}
          {s.note ? " ⚠" : ""}
        </option>
      ))}
    </select>
  );
}
