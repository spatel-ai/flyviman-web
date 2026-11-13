import { describe, expect, it } from "vitest";
import { blindScale, filmState, smoothstep } from "./film-math";

describe("smoothstep", () => {
  it("runs from 0 to 1 and clamps outside", () => {
    expect(smoothstep(-1)).toBe(0);
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(0.5)).toBe(0.5);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(2)).toBe(1);
  });
});

describe("filmState", () => {
  it("shows the first scene with the blinds open at the start", () => {
    expect(filmState(0, 3)).toEqual({ active: 0, local: 0, closure: 0 });
  });

  it("changes scene at whole numbers, with the blinds fully closed", () => {
    const before = filmState(0.999, 3);
    const after = filmState(1, 3);
    expect(before.active).toBe(0);
    expect(after.active).toBe(1);
    expect(after.closure).toBe(1);
    expect(before.closure).toBeGreaterThan(0.99);
  });

  it("keeps the blinds open mid-scene", () => {
    expect(filmState(1.5, 3).closure).toBe(0);
  });

  it("never closes the blinds before the first scene or after the last", () => {
    expect(filmState(0.2, 3).closure).toBe(0);
    expect(filmState(3, 3)).toEqual({ active: 2, local: 1, closure: 0 });
  });

  it("clamps positions outside the film", () => {
    expect(filmState(-1, 3).active).toBe(0);
    expect(filmState(9, 3).active).toBe(2);
  });
});

describe("blindScale", () => {
  it("closes the centre strips first", () => {
    const centre = blindScale(0.5, 7, 14);
    const edge = blindScale(0.5, 0, 14);
    expect(centre).toBeGreaterThan(edge);
  });

  it("is fully open at 0 and fully closed at 1 for every strip", () => {
    for (let index = 0; index < 14; index += 1) {
      expect(blindScale(0, index, 14)).toBe(0);
      expect(blindScale(1, index, 14)).toBe(1);
    }
  });
});
