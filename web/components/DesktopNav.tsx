"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isActive, NAV, type NavGroup } from "@/lib/nav";

function Dropdown({ label, groups }: { label: string; groups: NavGroup[] }) {
  const pathname = usePathname();
  // Opened on a given page; navigating elsewhere closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? pathname : null);
  const ref = useRef<HTMLDivElement>(null);
  const active = groups.some((g) => g.links.some((l) => isActive(l.href, pathname)));

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpenOn(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(null);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 transition-colors hover:text-white ${
          active ? "text-orange-400" : open ? "text-white" : ""
        }`}
      >
        {label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-30 mt-3 grid w-[30rem] -translate-x-1/2 grid-cols-2 gap-1 rounded-lg border border-neutral-700 bg-neutral-900 p-2 shadow-2xl">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                {g.title}
              </div>
              {g.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`block rounded-md px-2 py-1.5 hover:bg-neutral-800 ${
                    isActive(l.href, pathname) ? "bg-neutral-800/70" : ""
                  }`}
                >
                  <div
                    className={`text-sm ${
                      isActive(l.href, pathname) ? "text-orange-400" : "text-neutral-100"
                    }`}
                  >
                    {l.label}
                  </div>
                  {l.description && (
                    <div className="text-xs text-neutral-500">{l.description}</div>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-4 text-sm text-neutral-300 lg:flex">
      {NAV.map((item) =>
        "groups" in item ? (
          <Dropdown key={item.label} label={item.label} groups={item.groups} />
        ) : (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href, pathname) ? "page" : undefined}
            className={`transition-colors hover:text-white ${
              isActive(item.href, pathname) ? "text-orange-400" : ""
            }`}
          >
            {item.label}
          </Link>
        ),
      )}
    </nav>
  );
}
