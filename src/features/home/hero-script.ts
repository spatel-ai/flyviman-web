import { HERO } from "./hero-config";

export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
/** Where the film plays: a screen it fits (HERO.film), motion allowed. */
export const FILM_SCREEN = HERO.film.phones
  ? `not all and ${HERO.film.turnedPhone}`
  : HERO.film.media;

// Runs before the hero paints on a full page load, so the film's first
// frame and its tall track are there from the start (globals.css,
// `data-hero-film`). Without JavaScript it is not set and the page shows
// the still hero. If the page's scripts never
// arrive, the film is given up after a while rather than left stuck, and
// stays given up for this view of the page: starting it later would push
// everything below down by two or three screens.
// Listed in INLINE_SCRIPTS (lib/inline-scripts.ts) for a nonce-based
// Content-Security-Policy.
export const HERO_SCRIPT = `(function(){try{var r=document.documentElement,c=navigator.connection;if(!matchMedia(${JSON.stringify(FILM_SCREEN)}).matches||matchMedia(${JSON.stringify(REDUCED_MOTION)}).matches||(c&&c.saveData))return;r.setAttribute("data-hero-film","");setTimeout(function(){if(!r.hasAttribute("data-hero-live")){r.removeAttribute("data-hero-film");r.setAttribute("data-hero-gave-up","")}},8000)}catch(e){}})()`;

// Runs as the page is parsed, right after the two posters: where the still
// hero shows the last frame (reduced motion, data saver, a device too slow
// for the film), that poster is fetched at once and first instead of
// waiting as a lazy image. Where the film plays, or a phone shows the first
// frame as its band, the last poster is not displayed and stays lazy, so it
// is never fetched. Also listed in INLINE_SCRIPTS.
export const STILL_POSTER_SCRIPT = `(function(){try{var s=document.currentScript,l=s&&s.parentNode.querySelector(".hero-poster--last");if(!l||getComputedStyle(l).display==="none")return;l.fetchPriority="high";l.loading="eager"}catch(e){}})()`;
