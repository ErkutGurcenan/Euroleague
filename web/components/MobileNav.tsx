"use client";

import { useState } from "react";
import Link from "next/link";

export default function MobileNav({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative lg:hidden">
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
        <nav className="absolute left-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-md border border-neutral-700 bg-neutral-900 py-1 shadow-xl">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
