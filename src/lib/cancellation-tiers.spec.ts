import { describe, expect, it } from "vitest";
import {
  linesNotInSummary,
  noticeLabel,
  tierLines,
} from "./cancellation-tiers";

const STARTING = [
  { minHoursBeforeDeparture: 72, chargePercent: 10 },
  { minHoursBeforeDeparture: 24, chargePercent: 50 },
  { minHoursBeforeDeparture: 0, chargePercent: 100 },
];

describe("tierLines", () => {
  it("words the tiers as the API's summary does", () => {
    expect(tierLines(STARTING)).toEqual([
      "72 hours or more before departure: 10% of the price",
      "24 hours to under 72 hours before departure: 50% of the price",
      "Under 24 hours before departure, or a no-show: 100% of the price",
    ]);
  });

  it("words a single tier and a single hour", () => {
    expect(
      noticeLabel([{ minHoursBeforeDeparture: 0, chargePercent: 0 }], 0),
    ).toBe("Any time before departure, or a no-show");
    expect(
      noticeLabel(
        [
          { minHoursBeforeDeparture: 1, chargePercent: 0 },
          { minHoursBeforeDeparture: 0, chargePercent: 100 },
        ],
        1,
      ),
    ).toBe("Under 1 hour before departure, or a no-show");
  });
});

describe("linesNotInSummary", () => {
  const summary = `Flyviman's cancellation terms, the same for every operator. ${tierLines(STARTING).join(". ")}. A charge is taken only from a confirmed price.`;

  it("lists nothing when the saved summary already words every tier", () => {
    expect(linesNotInSummary(summary, STARTING)).toEqual([]);
    expect(linesNotInSummary("Any summary", [])).toEqual([]);
  });

  it("lists every tier, in the API's wording, when the summary does not", () => {
    expect(linesNotInSummary("Operator terms apply.", STARTING)).toEqual(
      tierLines(STARTING),
    );
  });
});
