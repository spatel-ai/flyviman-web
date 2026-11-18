import { HOME } from "@/content/home";
import { FOCAL_PATH, focalXAt, objectPositionX } from "./focal-path";
import FRAMES from "./hero-frames.json";

/** The frame sets scripts/extract-hero-frames.mjs makes (CR-2d). */
export type HeroSet = "desktop" | "phone" | "tablet-portrait";

/** One numbered WebP sequence made by scripts/extract-hero-frames.mjs. */
export interface HeroSequence {
  name: HeroSet;
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
  /**
   * The same for the first poster (a desktop frame) on a screen this set
   * plays on, so it shows what the set's first frame shows: the portrait
   * sets are slices along the focal path.
   */
  posterFocalX: number;
  /**
   * Frames kept decoded around the current one, most of them ahead in
   * the scroll's direction.
   */
  decodeAhead: number;
  decodeBehind: number;
}

/** Count and size as the script wrote them (hero-frames.json). */
interface Made {
  count: number;
  width: number;
  height: number;
}

const sequence = (
  name: HeroSet,
  decode: { ahead: number; behind: number },
): HeroSequence => {
  const made: Made = FRAMES[name];
  const portrait = name !== "desktop";
  // The slice's width in the desktop frame's pixels.
  const slice = (made.width / made.height) * FRAMES.desktop.height;
  return {
    name,
    ...made,
    focalX: 0.5,
    posterFocalX: portrait
      ? objectPositionX(focalXAt(FOCAL_PATH, 0), slice, FRAMES.desktop.width)
      : 0.5,
    decodeAhead: decode.ahead,
    decodeBehind: decode.behind,
    path: (n) => `/hero/${name}/frame-${String(n).padStart(3, "0")}.webp`,
  };
};

/**
 * Every value that tunes the home page hero (hero.tsx). Progress `p` runs
 * from 0 at the top of the page to 1 where the hero lets go; each pair
 * below is the stretch of `p` over which something happens.
 */
export const HERO = {
  film: {
    /**
     * Where the film plays without the phone sets: tablets (portrait and
     * landscape), laptops and desktops. Under reduced motion or data
     * saver, or after sustained slow frames (`giveUp`), the hero is a
     * still everywhere. Kept in step with the media queries in globals.css.
     */
    media: "(min-width: 744px) and (min-height: 600px)",
    /**
     * Phones and upright tablets play the film too (CR-2d), from portrait
     * frame sets cropped along the focal path (`focalPath`). False gives
     * phones the still hero (the first frame as a band, the card below)
     * and every other screen the desktop set.
     */
    phones: true,
    /**
     * Which set plays where; anything else gets the desktop set. Kept in
     * step with the media queries in globals.css.
     */
    screens: {
      /** Phones, upright or turned: narrower than 744 px or under 600 px tall. */
      phone: "(max-width: 743.98px), (max-height: 599.98px)",
      /** Upright tablets. */
      "tablet-portrait":
        "(min-width: 744px) and (min-height: 600px) and (orientation: portrait)",
    },
  },
  /** Height of the scroll track; the stage is about one screen of it. */
  track: { desktop: "280vh", phone: "240vh" },
  /**
   * How long the drawn film takes to catch up with the scroll, in ms
   * (about 95% of the way), whatever the screen's refresh rate.
   */
  settleMs: 150,
  /** The canvas is never sharper than this many device pixels per pixel. */
  maxPixelRatio: 2,
  /**
   * When drawing with the best filter is slow (no GPU), the film steps
   * down to a cheaper one, and never back up during the page view. A draw
   * is slow when the next frame starts more than `slowMs` after it (1.5
   * frames at 60 Hz: the draw held the frame up). Two slow draws of the
   * last ten step down: with a GPU that never happens; without one it
   * happens within the first few draws, before the film stutters.
   */
  slowDraws: { slowMs: 25, slowDraws: 2, of: 10 },
  /**
   * When the cheapest filter is already in use and frames still run late
   * (4 of the last 10 draws hold the next frame back by more than 50 ms,
   * under 20 frames a second), the film gives way to the still hero with
   * the card for the rest of the visit.
   */
  giveUp: { slowMs: 50, slowDraws: 4, of: 10 },
  /**
   * The film's first and last frames as stills, from the desktop sequence:
   * the first paints before any script and is the phone still's band; the
   * last is the still hero where the film could play but does not (reduced
   * motion, data saver, no JavaScript).
   */
  posters: {
    first: "/hero/desktop/poster-first.webp",
    last: "/hero/desktop/poster-last.webp",
  },
  sequences: {
    // A 1280 x 720 frame decodes to 3.7 MB, so 32 frames hold about 120 MB.
    desktop: sequence("desktop", { ahead: 24, behind: 8 }),
    // A 380 x 720 slice decodes to 1.1 MB: 16 hold about 18 MB.
    phone: sequence("phone", { ahead: 12, behind: 4 }),
    // A 520 x 720 slice decodes to 1.5 MB: 16 hold about 24 MB.
    "tablet-portrait": sequence("tablet-portrait", { ahead: 12, behind: 4 }),
  } satisfies Record<HeroSet, HeroSequence>,
  /** Where the portrait sets are cropped (focal-path.ts). */
  focalPath: FOCAL_PATH,
  /** Where the phone still's band is cropped (object-position x). */
  bandFocalX: 0.62,
  loading: {
    /** Frames fetched at once, from the start of the sequence. */
    eager: 10,
    /** Then every nth frame across the sequence, then the rest. */
    coarseStep: 4,
    concurrency: 6,
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
