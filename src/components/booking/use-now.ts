"use client";

import { useSyncExternalStore } from "react";

const TICK_MS = 30_000;

function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, TICK_MS);
  return () => window.clearInterval(timer);
}

let last = 0;
/** The clock, rounded to the tick so the snapshot is stable between ticks. */
function snapshot(): number {
  const now = Math.floor(Date.now() / TICK_MS) * TICK_MS;
  if (now !== last) last = now;
  return last;
}

/**
 * The current time, updated every 30 seconds, read in the browser only, so
 * a price left on screen is shown as expired once its validity passes
 * (business rule 1). 0 while the page is built ahead of time.
 */
export function useNow(): number {
  return useSyncExternalStore(subscribe, snapshot, () => 0);
}
