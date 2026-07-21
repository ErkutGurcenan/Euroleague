import Link from "next/link";

export default function PlayerViewToggle({
  code,
  active,
}: {
  code: string;
  active: "season" | "career";
}) {
  const base =
    "px-3 py-1 text-xs transition-colors";
  const on = "bg-orange-600 text-white";
  const off = "text-neutral-400 hover:text-white";
  return (
    <span className="flex shrink-0 overflow-hidden rounded-md border border-neutral-700">
      <Link
        href={`/players/${code}`}
        className={`${base} ${active === "season" ? on : off}`}
      >
        This season
      </Link>
      <Link
        href={`/players/${code}/career`}
        className={`${base} ${active === "career" ? on : off}`}
      >
        Career
      </Link>
    </span>
  );
}
