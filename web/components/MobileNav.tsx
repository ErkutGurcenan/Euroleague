"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, NAV, type NavLink } from "@/lib/nav";

export default function MobileNav({ season }: { season: React.ReactNode }) {
  const pathname = usePathname();
  // Opened on a given page; navigating elsewhere closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? pathname : null);

  const item = (l: NavLink, indent = false) => (
    <Link
      key={l.href}
      href={l.href}
      onClick={() => setOpen(false)}
      className={`block py-2 text-sm hover:bg-neutral-800 ${indent ? "pl-5 pr-3" : "px-3"} ${
        isActive(l.href, pathname) ? "text-orange-400" : "text-neutral-200"
      }`}
    >
      {l.label}
    </Link>
  );

  return (
    // Below sm the menu hangs from the header's left edge, not the button, so it fits on a phone.
    <div className="sm:relative lg:hidden">
      <button
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-700 text-neutral-300 hover:text-white"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d={open ? "M3 3 L13 13 M13 3 L3 13" : "M2 4h12 M2 8h12 M2 12h12"}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {open && (
        <nav className="absolute left-4 top-full z-30 mt-1 max-h-[80vh] w-56 overflow-y-auto rounded-md border border-neutral-700 bg-neutral-900 py-1 shadow-xl sm:left-0 sm:mt-2">
          {/* The header has no room for the season picker on phones. */}
          <div className="flex items-center justify-between border-b border-neutral-800 px-3 pb-2 pt-1 sm:hidden">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Season
            </span>
            {season}
          </div>
          {NAV.map((entry) =>
            "groups" in entry ? (
              <div key={entry.label} className="border-y border-neutral-800 py-1">
                {entry.groups.map((g) => (
                  <div key={g.title}>
                    <div className="px-3 pb-0.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                      {entry.label} · {g.title}
                    </div>
                    {g.links.map((l) => item(l, true))}
                  </div>
                ))}
              </div>
            ) : (
              item(entry)
            ),
          )}
        </nav>
      )}
    </div>
  );
}
