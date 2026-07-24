import Link from "next/link";

export default function PlayersToggle({
  active,
}: {
  active: "pergame" | "shooting";
}) {
  const base = "px-3 py-1 text-xs transition-colors";
  const on = "bg-orange-600 text-white";
  const off = "text-neutral-400 hover:text-white";
  return (
    <span className="flex shrink-0 overflow-hidden rounded-md border border-neutral-700">
      <Link href="/players" className={`${base} ${active === "pergame" ? on : off}`}>
        Per game
      </Link>
      <Link
        href="/shooting"
        className={`${base} ${active === "shooting" ? on : off}`}
      >
        Shooting
      </Link>
    </span>
  );
}
