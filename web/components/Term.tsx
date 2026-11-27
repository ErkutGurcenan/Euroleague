"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TERMS } from "@/lib/glossary";

const WIDTH = 256;
const EDGE = 8;

type Place = { left: number; top?: number; bottom?: number };

/** A label that explains itself: dotted underline, and on hover, keyboard
    focus or a tap, the term's one-line explanation from the Guide's list
    (lib/glossary.ts) with a link to its full entry. The pop-up is drawn on
    the page body, so tables that scroll sideways can't clip it. */
export default function Term({ id, children }: { id: string; children?: React.ReactNode }) {
  const term = TERMS[id];
  const tipId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const pointer = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [place, setPlace] = useState<Place | null>(null);
  const open = place !== null;

  const show = () => {
    clearTimeout(timer.current);
    const r = button.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.max(EDGE, Math.min(r.left + r.width / 2 - WIDTH / 2, window.innerWidth - WIDTH - EDGE));
    // Below the label, or above it when the label sits low on the screen.
    setPlace(
      r.bottom > window.innerHeight * 0.65
        ? { left, bottom: window.innerHeight - r.top + 6 }
        : { left, top: r.bottom + 6 },
    );
  };
  const hide = () => {
    clearTimeout(timer.current);
    setPlace(null);
  };
  // Short grace period so the mouse can move from the label onto the pop-up.
  const hideSoon = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPlace(null), 150);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setPlace(null);
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!button.current?.contains(t) && !tip.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    // Its position is fixed, so any scroll (page or table) would leave it behind.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!term) return <>{children}</>;
  return (
    <>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onPointerDown={(e) => {
          pointer.current = e.pointerType;
        }}
        onPointerEnter={(e) => e.pointerType === "mouse" && show()}
        onPointerLeave={(e) => e.pointerType === "mouse" && hideSoon()}
        // A mouse click keeps it open (hover already opened it); a tap or Enter toggles it.
        onClick={() => {
          if (pointer.current === "mouse" || !open) show();
          else hide();
          pointer.current = "";
        }}
        onFocus={(e) => e.currentTarget.matches(":focus-visible") && show()}
        onBlur={(e) => {
          if (e.relatedTarget && !tip.current?.contains(e.relatedTarget)) hide();
        }}
        className="cursor-help underline decoration-neutral-500 decoration-dotted underline-offset-[3px] [text-transform:inherit] hover:text-white"
      >
        {children ?? term.label}
      </button>
      {place &&
        createPortal(
          <div
            ref={tip}
            id={tipId}
            role="tooltip"
            style={{ left: place.left, top: place.top, bottom: place.bottom, width: WIDTH }}
            onPointerEnter={() => clearTimeout(timer.current)}
            onPointerLeave={(e) => e.pointerType === "mouse" && hideSoon()}
            className="fixed z-50 max-w-[calc(100vw-16px)] rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-left text-sm leading-snug text-neutral-300 shadow-2xl"
          >
            <div className="mb-1 font-semibold text-neutral-100">
              {term.label}
              {term.name && <span className="font-normal text-neutral-500"> · {term.name}</span>}
            </div>
            <p>{term.short}</p>
            {/* A plain link on purpose: only a full page load makes the Guide's
                :target highlight show (client-side navigation doesn't update it). */}
            <a href={`/guide#${term.id}`} className="mt-1.5 inline-block text-xs text-orange-400 hover:underline">
              More in the Guide →
            </a>
          </div>,
          document.body,
        )}
    </>
  );
}
