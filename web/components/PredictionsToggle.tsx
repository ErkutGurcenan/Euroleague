import Link from "next/link";

export default function PredictionsToggle({ active }: { active: "overview" | "history" }) {
  const base = "px-3 py-1 text-xs transition-colors";
  const on = "bg-orange-600 text-white";
  const off = "text-neutral-400 hover:text-white";
  return (
    <span className="flex shrink-0 overflow-hidden rounded-md border border-neutral-700">
      <Link href="/predictions" className={`${base} ${active === "overview" ? on : off}`}>
        Overview
      </Link>
      <Link href="/predictions/history" className={`${base} ${active === "history" ? on : off}`}>
        History
      </Link>
    </span>
  );
}
