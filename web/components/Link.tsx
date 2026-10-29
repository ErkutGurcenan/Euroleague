"use client";

import NextLink from "next/link";
import { useState, type ComponentProps } from "react";

/** next/link that pre-loads a page only when the visitor shows intent
    (pointer over it, finger on it, keyboard focus), not for every link on
    screen: by default a visit to Games set off 161 background page builds,
    Home 105 and Standings 73, too many for this small server. This is the
    hover-prefetch pattern from the Next.js prefetching guide ("Preventing
    too many prefetches"). Use it instead of next/link everywhere. */
export default function Link({ prefetch, onMouseEnter, onTouchStart, onFocus, ...props }: ComponentProps<typeof NextLink>) {
  const [intent, setIntent] = useState(false);
  return (
    <NextLink
      {...props}
      prefetch={prefetch === false || !intent ? false : (prefetch ?? null)}
      onMouseEnter={(e) => {
        setIntent(true);
        onMouseEnter?.(e);
      }}
      onTouchStart={(e) => {
        setIntent(true);
        onTouchStart?.(e);
      }}
      onFocus={(e) => {
        setIntent(true);
        onFocus?.(e);
      }}
    />
  );
}
