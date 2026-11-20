import { describe, expect, it } from "vitest";
import { tiersSchema } from "./schema";

const row = (hours: string, percent: string) => ({
  minHoursBeforeDeparture: hours,
  chargePercent: percent,
});

const STARTING = [row("72", "10"), row("24", "50"), row("0", "100")];

function issues(tiers: ReturnType<typeof row>[], reason = "Owner decision") {
  const result = tiersSchema.safeParse({ tiers, reason });
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."));
}

describe("tiersSchema (the API's limits)", () => {
  it("accepts the starting table and returns numbers", () => {
    const result = tiersSchema.parse({ tiers: STARTING, reason: " Why " });
    expect(result).toEqual({
      tiers: [
        { minHoursBeforeDeparture: 72, chargePercent: 10 },
        { minHoursBeforeDeparture: 24, chargePercent: 50 },
        { minHoursBeforeDeparture: 0, chargePercent: 100 },
      ],
      reason: "Why",
    });
  });

  it("requires a reason", () => {
    expect(issues(STARTING, " ")).toContain("reason");
  });

  it("refuses notice out of order or repeated", () => {
    expect(
      issues([row("24", "50"), row("72", "50"), row("0", "100")]),
    ).toContain("tiers.1.minHoursBeforeDeparture");
    expect(
      issues([row("24", "50"), row("24", "60"), row("0", "100")]),
    ).toContain("tiers.1.minHoursBeforeDeparture");
  });

  it("requires the last tier at 0 hours", () => {
    expect(issues([row("72", "10"), row("24", "50")])).toContain(
      "tiers.1.minHoursBeforeDeparture",
    );
  });

  it("refuses a charge that falls as notice shortens", () => {
    expect(issues([row("72", "60"), row("0", "50")])).toContain(
      "tiers.1.chargePercent",
    );
  });

  it.each([
    ["1.5", "10"],
    ["-1", "10"],
    ["8761", "10"],
    ["0", "101"],
    ["0", "10.5"],
    ["0", ""],
    ["0", "1e1"],
  ])("refuses %s hours at %s%%", (hours, percent) => {
    expect(issues([row(hours, percent)]).length).toBeGreaterThan(0);
  });

  it("refuses no tiers and more than ten", () => {
    expect(issues([])).toContain("tiers");
    expect(
      issues(Array.from({ length: 11 }, (_, i) => row(String(10 - i), "100"))),
    ).toContain("tiers");
  });
});
