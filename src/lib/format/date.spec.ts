import { describe, expect, it } from "vitest";
import { formatDay } from "./date";

describe("formatDay", () => {
  it("formats a calendar date without shifting it across time zones", () => {
    expect(formatDay("2030-12-31")).toBe("31 Dec 2030");
    expect(formatDay("2030-12-31T00:00:00.000Z")).toBe("31 Dec 2030");
  });

  it("shows a value it cannot read as it is", () => {
    expect(formatDay("soon")).toBe("soon");
  });
});
