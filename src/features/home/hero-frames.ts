/**
 * Loading and drawing the hero's frames (hero.tsx). The pure parts are
 * tested in hero-frames.spec.ts.
 */

/** A rectangle of the source frame, in its own pixels. */
export interface SourceRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/**
 * The part of a `width` x `height` frame that fills a `cw` x `ch` box the
 * way CSS `object-fit: cover` does: cropped, never letterboxed. `focalX`
 * and `focalY` are `object-position` fractions.
 */
export function coverRect(
  width: number,
  height: number,
  cw: number,
  ch: number,
  focalX = 0.5,
  focalY = 0.5,
): SourceRect {
  const scale = Math.max(cw / width, ch / height);
  const sw = Math.min(width, cw / scale);
  const sh = Math.min(height, ch / scale);
  return { sx: (width - sw) * focalX, sy: (height - sh) * focalY, sw, sh };
}

/** Which frame (from 0) shows at `progress`, played linearly over `range`. */
export function frameAt(
  progress: number,
  range: readonly [number, number],
  count: number,
): number {
  const t = (progress - range[0]) / (range[1] - range[0]);
  return Math.round(Math.min(1, Math.max(0, t)) * (count - 1));
}

/**
 * The order frames are fetched in: the first `eager`, then every `step`th
 * across the whole sequence (and the last), then everything between.
 */
export function loadOrder(count: number, eager: number, step: number) {
  const order: number[] = [];
  const seen = new Set<number>();
  const add = (index: number) => {
    if (index < count && !seen.has(index)) {
      seen.add(index);
      order.push(index);
    }
  };
  for (let i = 0; i < eager; i += 1) add(i);
  for (let i = 0; i < count; i += step) add(i);
  add(count - 1);
  for (let i = 0; i < count; i += 1) add(i);
  return order;
}

/** The loaded frame closest to `index`, or -1 when none has loaded. */
export function nearestLoaded(loaded: ArrayLike<unknown>, index: number) {
  for (let distance = 0; distance < loaded.length; distance += 1) {
    if (loaded[index - distance]) return index - distance;
    if (loaded[index + distance]) return index + distance;
  }
  return -1;
}

type Frame = ImageBitmap | HTMLImageElement;

export interface FrameStore {
  /** The decoded frame nearest to `index`, if any is decoded. */
  nearest(index: number): { index: number; image: Frame } | null;
  /**
   * Where the film is: frames within the decode window around it are
   * decoded, and decoded frames outside it are closed.
   */
  focus(index: number): void;
  /** The slice of each frame that is kept, in source pixels. */
  readonly keep: { x: number; width: number };
  destroy(): void;
}

interface LoadOptions {
  count: number;
  path: (n: number) => string;
  eager: number;
  coarseStep: number;
  concurrency: number;
  /** Frames either side of the focus kept decoded at once. */
  decodeWindow: number;
  /** Frame height in source pixels, and the slice of its width to keep. */
  height: number;
  keep: { x: number; width: number };
  /** Called as each frame becomes drawable. */
  onLoad: (index: number) => void;
}

/**
 * Fetches the sequence in `loadOrder`, a few at a time. Where
 * `createImageBitmap` exists the compressed files are kept (about 30 KB
 * each) and only the frames near the focus are decoded, off the main
 * thread and only the `keep` slice of each: a decoded 1280 x 720 frame
 * takes 3.7 MB, so decoding all of them would take hundreds. Without it
 * (old browsers) the images are kept and the browser manages decoding.
 */
export function loadFrames(options: LoadOptions): FrameStore {
  const { count, path, height, decodeWindow, onLoad } = options;
  const bitmaps = typeof createImageBitmap === "function";
  const keep = bitmaps
    ? {
        x: Math.floor(options.keep.x),
        width: Math.ceil(options.keep.width),
      }
    : { x: 0, width: Number.POSITIVE_INFINITY };
  const files: (Blob | undefined)[] = new Array(count);
  const decoded: (Frame | undefined)[] = new Array(count);
  const decoding = new Set<number>();
  const queue = loadOrder(count, options.eager, options.coarseStep);
  const abort = new AbortController();
  let alive = true;
  let focus = 0;

  const near = (index: number) => Math.abs(index - focus) <= decodeWindow;

  async function decode(index: number) {
    const file = files[index];
    if (!file || decoded[index] || decoding.has(index)) return;
    decoding.add(index);
    try {
      const frame = await createImageBitmap(
        file,
        keep.x,
        0,
        keep.width,
        height,
      );
      if (!alive || !near(index)) {
        frame.close();
        return;
      }
      decoded[index] = frame;
      onLoad(index);
    } catch {
      // A frame that fails is skipped: its neighbour is drawn instead.
    } finally {
      decoding.delete(index);
    }
  }

  async function fetchOne(index: number) {
    const url = path(index + 1);
    if (!bitmaps) {
      const image = new Image();
      image.decoding = "async";
      image.src = url;
      await image.decode();
      if (!alive) return;
      decoded[index] = image;
      onLoad(index);
      return;
    }
    const response = await fetch(url, { signal: abort.signal });
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    const file = await response.blob();
    if (!alive) return;
    files[index] = file;
    if (near(index)) await decode(index);
  }

  async function worker() {
    while (alive) {
      const index = queue.shift();
      if (index === undefined) return;
      try {
        await fetchOne(index);
      } catch {
        // A frame that fails is skipped: its neighbour is drawn instead.
      }
    }
  }
  for (let i = 0; i < options.concurrency; i += 1) void worker();

  return {
    keep,
    nearest(index) {
      const found = nearestLoaded(decoded, index);
      return found < 0 ? null : { index: found, image: decoded[found]! };
    },
    focus(index) {
      if (!bitmaps || index === focus) return;
      focus = index;
      decoded.forEach((frame, i) => {
        if (frame && !near(i) && "close" in frame) {
          frame.close();
          decoded[i] = undefined;
        }
      });
      // Nearest first, so the frame wanted now is ready soonest.
      for (let d = 0; d <= decodeWindow; d += 1) {
        for (const i of d === 0 ? [index] : [index - d, index + d]) {
          if (i >= 0 && i < count) void decode(i);
        }
      }
    },
    destroy() {
      alive = false;
      abort.abort();
      for (const frame of decoded) {
        if (frame && "close" in frame) frame.close();
      }
      decoded.length = 0;
      files.length = 0;
    },
  };
}

/** Draws `rect` of the source frame over the whole canvas. */
export function drawFrame(
  context: CanvasRenderingContext2D,
  image: Frame,
  rect: SourceRect,
  keepX: number,
) {
  const { width, height } = context.canvas;
  context.drawImage(
    image,
    rect.sx - keepX,
    rect.sy,
    rect.sw,
    rect.sh,
    0,
    0,
    width,
    height,
  );
}
