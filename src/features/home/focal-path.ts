/**
 * Where the hero film's portrait frames are cropped (CR-2d): the
 * horizontal centre of the crop over the clip's time, as keyframes. The
 * crop follows the wing at first, then the window it is seen through,
 * then holds the cabin centred: the porthole, then the aisle.
 *
 * Kept free of imports: scripts/extract-hero-frames.mjs reads this file
 * directly (Node strips the types), and hero-config.ts passes it on as
 * HERO.focalPath. Change the keyframes here and re-run the script.
 */

/** At `t` seconds into the clip, the crop is centred at `x` (0 left, 1 right). */
export interface FocalKey {
  t: number;
  x: number;
}

/** Tuned by eye on the 1280 x 720 clip (24 fps, 8 s). */
export const FOCAL_PATH: readonly FocalKey[] = [
  // The wing, on the right of the frame.
  { t: 0, x: 0.8 },
  { t: 0.5, x: 0.8 },
  // Through the window to the porthole, centred from here on.
  { t: 1.6, x: 0.5 },
];

/**
 * The crop's centre at `t` seconds: held before the first keyframe and
 * after the last, eased between neighbours (smoothstep), so it starts and
 * stops gently and never jumps.
 */
export function focalXAt(path: readonly FocalKey[], t: number): number {
  const first = path[0];
  const last = path[path.length - 1];
  if (t <= first.t) return first.x;
  if (t >= last.t) return last.x;
  const next = path.findIndex((key) => key.t > t);
  const a = path[next - 1];
  const b = path[next];
  const u = (t - a.t) / (b.t - a.t);
  return a.x + (b.x - a.x) * u * u * (3 - 2 * u);
}

/**
 * The left edge, in source pixels, of a `cropWidth` slice of a
 * `sourceWidth` frame centred at `x`, kept inside the frame.
 */
export function cropLeft(x: number, cropWidth: number, sourceWidth: number) {
  const left = Math.round(x * sourceWidth - cropWidth / 2);
  return Math.min(sourceWidth - cropWidth, Math.max(0, left));
}

/**
 * The same crop as CSS `object-position` counts it (0 keeps the left
 * edge, 1 the right), for a poster cropped to a box of the crop's shape.
 */
export function objectPositionX(
  x: number,
  cropWidth: number,
  sourceWidth: number,
) {
  if (cropWidth >= sourceWidth) return 0.5;
  return cropLeft(x, cropWidth, sourceWidth) / (sourceWidth - cropWidth);
}
