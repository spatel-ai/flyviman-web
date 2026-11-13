import { describe, expect, it } from "vitest";
import { Spring } from "./spring";

function run(spring: Spring, seconds: number): number[] {
  const values: number[] = [];
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) {
    values.push(spring.step(1 / 60));
  }
  return values;
}

describe("Spring", () => {
  it("starts at rest", () => {
    const spring = new Spring();
    expect(spring.value).toBe(0);
    expect(spring.settled).toBe(true);
  });

  it("reaches its target and settles", () => {
    const spring = new Spring();
    spring.target = 1;
    expect(spring.settled).toBe(false);

    run(spring, 2);
    expect(spring.value).toBeCloseTo(1, 2);
    expect(spring.settled).toBe(true);
  });

  it("never overshoots: nothing bounces", () => {
    const spring = new Spring();
    spring.target = 1;
    expect(Math.max(...run(spring, 2))).toBeLessThanOrEqual(1);
  });

  it("returns to rest when the target goes back", () => {
    const spring = new Spring();
    spring.target = 1;
    run(spring, 0.2);
    spring.target = 0;
    const values = run(spring, 2);
    expect(values.at(-1)).toBeCloseTo(0, 2);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(-0.001);
  });

  it("is not thrown by a long pause between frames", () => {
    const spring = new Spring();
    spring.target = 1;
    spring.step(30);
    expect(spring.value).toBeGreaterThanOrEqual(0);
    expect(spring.value).toBeLessThanOrEqual(1);
  });

  it("snaps to the target without motion", () => {
    const spring = new Spring();
    spring.target = 0.5;
    spring.snap();
    expect(spring.value).toBe(0.5);
    expect(spring.settled).toBe(true);
  });
});
