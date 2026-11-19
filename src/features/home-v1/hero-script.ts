export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

// Runs before the hero paints on a full page load, so the film's first
// frame and its tall track are there from the start (home-v1.css,
// `data-hero-v1-film`). Without JavaScript it is not set and the page shows
// the still hero. If the page's scripts never
// arrive, the film is given up after a while rather than left stuck, and
// stays given up for this view of the page: starting it later would push
// everything below down by two or three screens. The Content-Security-Policy
// allows it by its hash, computed from this constant (lib/csp.ts).
export const HERO_V1_SCRIPT = `(function(){try{var r=document.documentElement,c=navigator.connection;if(matchMedia(${JSON.stringify(REDUCED_MOTION)}).matches||(c&&c.saveData))return;r.setAttribute("data-hero-v1-film","");setTimeout(function(){if(!r.hasAttribute("data-hero-v1-live")){r.removeAttribute("data-hero-v1-film");r.setAttribute("data-hero-v1-gave-up","")}},8000)}catch(e){}})()`;
