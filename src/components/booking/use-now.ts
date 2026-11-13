"use client";

import { useSyncExternalStore } from "react";

const TICK_MS = 30_000;

function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, TICK_MS);
  return () => window.clearInterval(timer);
}

/**
 * The clock, rounded down to the tick so the snapshot is stable between
 * ticks; an estimate shows as expired up to 30 seconds late.
 */
function snapshot(): number {
  return Math.floor(Date.now() / TICK_MS) * TICK_MS;
}

/**
 * The current time, updated every 30 seconds, read in the browser only, so
 * a price left on screen is shown as expired once its validity passes
 * (business rule 1). 0 while the page is built ahead of time.
 */
export function useNow(): number {
  return useSyncExternalStore(subscribe, snapshot, () => 0);
}
