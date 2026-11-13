import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { HERO } from "./hero-config";
import {
  coverRect,
  frameAt,
  loadFrames,
  loadOrder,
  nearestLoaded,
} from "./hero-frames";
import { segment } from "./use-scroll-progress";

describe("coverRect", () => {
  it("uses the whole frame when the box has its shape", () => {
    expect(coverRect(1280, 720, 1920, 1080)).toEqual({
      sx: 0,
      sy: 0,
      sw: 1280,
      sh: 720,
    });
  });

  it("crops the sides for a tall box, around the focal point", () => {
    // A phone: the frame's full height, a slice of its width.
    const rect = coverRect(1080, 608, 390, 844, 0.6);
    expect(rect.sh).toBe(608);
    expect(rect.sw).toBeCloseTo((608 * 390) / 844, 5);
    expect(rect.sx).toBeCloseTo((1080 - rect.sw) * 0.6, 5);
    expect(rect.sy).toBe(0);
  });

  it("crops top and bottom for a wide box, and never leaves the frame", () => {
    const rect = coverRect(1280, 720, 2560, 1080, 1);
    expect(rect.sw).toBe(1280);
    expect(rect.sx).toBe(0);
    expect(rect.sy + rect.sh).toBeLessThanOrEqual(720);
    expect(rect.sh).toBeCloseTo(540, 5);
  });
});

describe("frameAt", () => {
  const range = [0.05, 0.85] as const;

  it("holds the first frame before the range and the last after it", () => {
    expect(frameAt(0, range, 120)).toBe(0);
    expect(frameAt(0.05, range, 120)).toBe(0);
    expect(frameAt(0.85, range, 120)).toBe(119);
    expect(frameAt(1, range, 120)).toBe(119);
  });

  it("plays linearly between", () => {
    expect(frameAt(0.45, range, 121)).toBe(60);
    const frames = Array.from({ length: 50 }, (_, i) =>
      frameAt(i / 49, range, 120),
    );
    expect(frames).toEqual([...frames].sort((a, b) => a - b));
  });
});

describe("loadOrder", () => {
  it("starts with the first frames, then a coarse pass, then the rest", () => {
    const order = loadOrder(120, 10, 4);
    expect(order.slice(0, 10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(order.slice(10, 14)).toEqual([12, 16, 20, 24]);
    // Every frame once.
    expect([...order].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 120 }, (_, i) => i),
    );
    // The last frame is part of the coarse pass, not left to the end.
    expect(order.indexOf(119)).toBeLessThan(45);
  });

  it("copes with a sequence shorter than the eager count", () => {
    expect(loadOrder(3, 10, 4)).toEqual([0, 1, 2]);
  });
});

describe("nearestLoaded", () => {
  it("finds the closest loaded frame on either side", () => {
    const loaded = [true, undefined, undefined, undefined, true, undefined];
    expect(nearestLoaded(loaded, 0)).toBe(0);
    expect(nearestLoaded(loaded, 1)).toBe(0);
    expect(nearestLoaded(loaded, 3)).toBe(4);
    expect(nearestLoaded(loaded, 5)).toBe(4);
  });

  it("says so when nothing has loaded", () => {
    expect(nearestLoaded(new Array(4), 2)).toBe(-1);
  });
});

describe("segment", () => {
  it("runs from 0 to 1 across its range and stays within it", () => {
    expect(segment(0, [0.2, 0.4])).toBe(0);
    expect(segment(0.3, [0.2, 0.4])).toBeCloseTo(0.5, 5);
    expect(segment(0.9, [0.2, 0.4])).toBe(1);
  });
});

describe("the hero's settings", () => {
  it("has the frames on disk that it says it has, at the size it says", () => {
    for (const [name, sequence] of Object.entries(HERO.sequences)) {
      const frames = readdirSync(`public/hero/${name}`).filter((file) =>
        file.startsWith("frame-"),
      );
      expect(frames).toHaveLength(sequence.count);
      for (const n of [1, sequence.count]) {
        const file = `public${sequence.path(n)}`;
        expect(existsSync(file)).toBe(true);
        expect(webpSize(file)).toEqual({
          width: sequence.width,
          height: sequence.height,
        });
      }
    }
    expect(existsSync(`public${HERO.posters.first}`)).toBe(true);
    expect(existsSync(`public${HERO.posters.last}`)).toBe(true);
  });

  it("keeps the timeline in order", () => {
    const { openingOut, frames, scrim, eyebrow, headline, action } =
      HERO.timeline;
    for (const [from, to] of [
      openingOut,
      frames,
      scrim,
      eyebrow,
      headline,
      action,
    ]) {
      expect(from).toBeLessThan(to);
      expect(from).toBeGreaterThanOrEqual(0);
      expect(to).toBeLessThanOrEqual(1);
    }
    // The text arrives in turn, once the scrim is there to carry it.
    expect(eyebrow[0]).toBeLessThan(headline[0]);
    expect(headline[0]).toBeLessThan(action[0]);
    expect(scrim[1]).toBeLessThanOrEqual(headline[1]);
  });
});

/** Width and height from a WebP file's header (VP8, VP8L or VP8X). */
function webpSize(file: string) {
  const b = readFileSync(file);
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8 ") {
    return {
      width: b.readUInt16LE(26) & 0x3fff,
      height: b.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return {
    width: b.readUIntLE(24, 3) + 1,
    height: b.readUIntLE(27, 3) + 1,
  };
}

describe("loadFrames", () => {
  const closed: number[] = [];
  afterEach(() => {
    vi.unstubAllGlobals();
    closed.length = 0;
  });

  function stub() {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => ({
        ok: true,
        blob: async () => new Blob([url]),
      })),
    );
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async (blob: Blob) => {
        const n = Number((await blob.text()).match(/(\d+)$/)![1]) - 1;
        return { n, close: () => closed.push(n) };
      }),
    );
  }

  function start(onLoad = vi.fn()) {
    return loadFrames({
      count: 30,
      path: (n) => String(n),
      eager: 4,
      coarseStep: 4,
      concurrency: 3,
      decodeWindow: 2,
      height: 10,
      keep: { x: 0, width: 10 },
      onLoad,
    });
  }

  const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

  it("decodes only the frames near the focus, and closes those it leaves", async () => {
    stub();
    const onLoad = vi.fn();
    const store = start(onLoad);
    await settle();
    // Focus starts at 0: frames 0 to 2 are decoded, the rest only fetched.
    expect(onLoad.mock.calls.map(([i]) => i).sort((a, b) => a - b)).toEqual([
      0, 1, 2,
    ]);
    expect(store.nearest(20)?.index).toBe(2);

    store.focus(20);
    await settle();
    expect(store.nearest(20)?.index).toBe(20);
    expect([...closed].sort((a, b) => a - b)).toEqual([0, 1, 2]);
    expect(store.nearest(0)?.index).toBe(18);
    store.destroy();
  });

  it("closes every decoded frame when destroyed", async () => {
    stub();
    const store = start();
    await settle();
    store.destroy();
    expect([...closed].sort((a, b) => a - b)).toEqual([0, 1, 2]);
    expect(store.nearest(0)).toBeNull();
  });
});
