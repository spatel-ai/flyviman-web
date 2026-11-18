import { describe, expect, it } from "vitest";
import {
  FOCAL_PATH,
  cropLeft,
  focalXAt,
  objectPositionX,
  type FocalKey,
} from "./focal-path";

describe("focalXAt", () => {
  const path: FocalKey[] = [
    { t: 1, x: 0.8 },
    { t: 2, x: 0.8 },
    { t: 4, x: 0.4 },
  ];

  it("holds the first keyframe before it and the last after it", () => {
    expect(focalXAt(path, 0)).toBe(0.8);
    expect(focalXAt(path, 1.5)).toBe(0.8);
    expect(focalXAt(path, 4)).toBe(0.4);
    expect(focalXAt(path, 9)).toBe(0.4);
  });

  it("eases between keyframes: half way at the middle, gently at the ends", () => {
    expect(focalXAt(path, 3)).toBeCloseTo(0.6, 10);
    // Smoothstep: a tenth of the way in, it has moved 2.8% of the distance.
    expect(focalXAt(path, 2.2)).toBeCloseTo(0.8 - 0.4 * 0.028, 10);
    expect(focalXAt(path, 3.8)).toBeCloseTo(0.4 + 0.4 * 0.028, 10);
  });

  it("never jumps: small steps in time make small steps in x", () => {
    let last = focalXAt(FOCAL_PATH, 0);
    for (let t = 0; t <= 8; t += 1 / 24) {
      const x = focalXAt(FOCAL_PATH, t);
      expect(Math.abs(x - last)).toBeLessThan(0.02);
      last = x;
    }
  });
});

describe("the focal path", () => {
  it("runs forward in time and stays within the frame", () => {
    for (let i = 0; i < FOCAL_PATH.length; i += 1) {
      const { t, x } = FOCAL_PATH[i];
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      if (i > 0) expect(t).toBeGreaterThan(FOCAL_PATH[i - 1].t);
    }
  });

  it("starts on the wing, on the right, and ends centred", () => {
    expect(focalXAt(FOCAL_PATH, 0)).toBeGreaterThan(0.7);
    expect(focalXAt(FOCAL_PATH, 8)).toBe(0.5);
  });
});

describe("cropLeft", () => {
  it("centres the slice on x", () => {
    expect(cropLeft(0.5, 380, 1280)).toBe(450);
    expect(cropLeft(0.8, 380, 1280)).toBe(834);
  });

  it("keeps the slice inside the frame", () => {
    expect(cropLeft(0.95, 520, 1280)).toBe(760);
    expect(cropLeft(0, 520, 1280)).toBe(0);
  });
});

describe("objectPositionX", () => {
  it("places a box of the slice's shape where the slice is", () => {
    const p = objectPositionX(0.8, 380, 1280);
    expect(p * (1280 - 380)).toBeCloseTo(834, 5);
    expect(objectPositionX(0.5, 380, 1280)).toBe(0.5);
    expect(objectPositionX(0.95, 520, 1280)).toBe(1);
  });

  it("is the middle when the slice is the whole frame", () => {
    expect(objectPositionX(0.8, 1280, 1280)).toBe(0.5);
  });
});
