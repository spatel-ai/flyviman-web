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
  /** Height of the scroll track; the stage is one screen of it. */
  track: { desktop: "400vh", mobile: "300vh" },
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
    desktop: sequence("desktop", 120, 1280, 720, 0.5),
    // On a phone only a tall slice of the frame fits: keep the window in it.
    mobile: sequence("mobile", 80, 1080, 608, 0.6),
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
    /** The opening line and scroll cue leave, rising `openingRise` px. */
    openingOut: [0.03, 0.12],
    openingRise: 20,
    /** The frames play from first to last. */
    frames: [0.05, 0.85],
    scrim: [0.72, 0.85],
    /** The closing text enters, each part rising `enterRise` px. */
    eyebrow: [0.8, 0.88],
    headline: [0.835, 0.915],
    action: [0.87, 0.95],
    enterRise: 30,
  },
  /** The sky's slow drift while the page rests at the top. */
  drift: { scale: 1.03, seconds: 20 },
  text: HOME.hero,
} as const;

export type HeroRange = readonly [number, number];
