import { HOME } from "@/content/home";

/** One numbered WebP sequence made by scripts/extract-hero-frames.mjs. */
export interface HeroSequence {
  /** Number of frames; must match the script's output. */
  count: number;
  /** Pixel size of each frame. */
  width: number;
  height: number;
  /** Address of frame `n`, counted from 1. */
  path: (n: number) => string;
  /**
   * Which part of the frame stays in view when its sides are cropped, as
   * CSS `object-position` counts it: 0 keeps the left edge, 1 the right.
   */
  focalX: number;
}

const sequence = (
  name: string,
  count: number,
  width: number,
  height: number,
  focalX: number,
): HeroSequence => ({
  count,
  width,
  height,
  focalX,
  path: (n) => `/hero/${name}/frame-${String(n).padStart(3, "0")}.webp`,
});

/**
 * Every value that tunes the home page hero (hero.tsx). Progress `p` runs
 * from 0 at the top of the page to 1 where the hero lets go; each pair
 * below is the stretch of `p` over which something happens.
 */
export const HERO = {
  /** Height of the scroll track; the stage is about one screen of it. */
  track: { desktop: "280vh", mobile: "240vh" },
  /** Below this width the mobile sequence and layout are used. */
  mobileBelow: 768,
  /** How far the drawn progress closes on the scroll each frame (0 to 1). */
  lerp: 0.12,
  /** The canvas is never sharper than this many device pixels per pixel. */
  maxPixelRatio: 2,
  /**
   * The film's first and last frames as stills, from the desktop sequence:
   * the first paints before any script, the last is the still hero.
   */
  posters: {
    first: "/hero/desktop/poster-first.webp",
    last: "/hero/desktop/poster-last.webp",
  },
  sequences: {
    desktop: sequence("desktop", 96, 1280, 720, 0.5),
    // On a phone only a tall slice of the frame fits: keep the window in it.
    mobile: sequence("mobile", 60, 960, 540, 0.5),
  },
  loading: {
    /** Frames fetched at once, from the start of the sequence. */
    eager: 10,
    /** Then every nth frame across the sequence, then the rest. */
    coarseStep: 4,
    concurrency: 6,
    /** Frames either side of the current one kept decoded (memory). */
    decodeWindow: 8,
  },
  timeline: {
    /** The frames play from first to last. */
    frames: [0, 0.6],
    /**
     * Then the charter card rises over the last frame, `cardRise` px, and
     * holds, whole and usable, for the last quarter while the stage stays.
     */
    card: [0.6, 0.75],
    cardRise: 40,
  },
  text: HOME.hero,
} as const;

export type HeroRange = readonly [number, number];
