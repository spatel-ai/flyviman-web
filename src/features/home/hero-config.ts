import { HOME } from "@/content/home";
import FRAMES from "./hero-frames.json";

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

/** Count and size as the script wrote them (hero-frames.json). */
interface Made {
  count: number;
  width: number;
  height: number;
}

const sequence = (name: string, made: Made, focalX: number): HeroSequence => ({
  ...made,
  focalX,
  path: (n) => `/hero/${name}/frame-${String(n).padStart(3, "0")}.webp`,
});

const phoneFrames = (FRAMES as { phone?: Made }).phone;

/**
 * Every value that tunes the home page hero (hero.tsx). Progress `p` runs
 * from 0 at the top of the page to 1 where the hero lets go; each pair
 * below is the stretch of `p` over which something happens.
 */
export const HERO = {
  film: {
    /**
     * Where the film plays: tablets (portrait and landscape), laptops and
     * desktops. Elsewhere, and under reduced motion or data saver, the hero
     * is a still. Kept in step with the media queries in globals.css.
     */
    media: "(min-width: 744px) and (min-height: 600px)",
    /**
     * Phones (and landscape phones) get the still hero: the first frame as
     * a photo band, the card below it. To give them the film instead: run
     * `node scripts/extract-hero-frames.mjs --phone` (writes
     * public/hero/phone/ and its entry in hero-frames.json), set this to
     * true, and check the phone film rules in globals.css (`max-width:
     * 743.98px` under `data-hero-film`) and the hero tests in
     * e2e/motion.e2e.ts on the mobile project.
     */
    phones: false,
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
    desktop: sequence("desktop", FRAMES.desktop, 0.5),
    // Only made with --phone (see `film.phones`).
    ...(phoneFrames && { phone: sequence("phone", phoneFrames, 0.5) }),
  } as { desktop: HeroSequence; phone?: HeroSequence },
  /** Where the phone still's band is cropped (object-position x). */
  bandFocalX: 0.62,
  loading: {
    /** Frames fetched at once, from the start of the sequence. */
    eager: 10,
    /** Then every nth frame across the sequence, then the rest. */
    coarseStep: 4,
    concurrency: 6,
    /**
     * Frames kept decoded around the current one, most of them ahead in
     * the scroll's direction. A 1280 x 720 frame decodes to 3.7 MB, so 32
     * frames hold about 120 MB.
     */
    decodeAhead: 24,
    decodeBehind: 8,
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
