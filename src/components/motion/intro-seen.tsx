"use client";

import { useEffect } from "react";

export const INTRO_STORAGE_KEY = "flyviman-intro";

/** A little longer than the intro's last animation (globals.css). */
const INTRO_MS = 1800;

// Runs before the curtain paints on a full page load: a visitor who has
// already seen the intro in this browser session gets the page straight
// away. It only reads; IntroSeen records the visit.
const SCRIPT = `try{if(sessionStorage.getItem(${JSON.stringify(INTRO_STORAGE_KEY)}))document.documentElement.dataset.introSeen=""}catch(e){}`;

/**
 * The inline script, inert when React creates it in the browser (a script
 * inserted on a client navigation never runs, and React warns about it):
 * node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md
 */
export function IntroScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: SCRIPT }}
    />
  );
}

/**
 * Records that the intro has played: for this browser session (so a reload
 * skips it) and on `<html>` once it has finished (so returning to the home
 * page without a reload skips it too).
 */
export function IntroSeen() {
  useEffect(() => {
    try {
      sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
    } catch {
      // Storage is blocked: the intro simply plays on each full load.
    }
    const mark = () => {
      document.documentElement.dataset.introSeen = "";
    };
    const mounted = performance.now();
    const timer = window.setTimeout(mark, INTRO_MS);
    return () => {
      window.clearTimeout(timer);
      // Leaving the page part-way through counts as seen. (Development's
      // immediate remount does not: it would cancel the intro.)
      if (performance.now() - mounted > 300) mark();
    };
  }, []);
  return null;
}
