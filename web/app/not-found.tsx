import Link from "next/link";
import Logo from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <Logo size={56} />
      <h1 className="mt-6 text-2xl font-bold">Shot clock violation</h1>
      <p className="mt-2 max-w-sm text-sm text-neutral-400">
        This page doesn&apos;t exist — maybe the player was traded, the game
        never happened, or the URL took a bad dribble.
      </p>
      <div className="mt-6 flex gap-3 text-sm">
        <Link
          href="/"
          className="rounded-md bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-500"
        >
          Back home
        </Link>
        <Link
          href="/players"
          className="rounded-md border border-neutral-700 px-4 py-2 text-neutral-300 hover:text-white"
        >
          Browse players
        </Link>
      </div>
    </div>
  );
}
