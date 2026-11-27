import { describe, expect, it } from "vitest";
import {
  NOT_STATED,
  nextShown,
  PAGE_SIZE,
  shownValue,
  visibleItems,
} from "./listing-facts";

const details = [
  { label: "Location", value: "United Kingdom" },
  { label: "Total Time", value: "5236 hrs" },
];

describe("shownValue", () => {
  it("returns the stated value", () => {
    expect(shownValue(details, "Location")).toBe("United Kingdom");
    expect(shownValue(details, "Total Time")).toBe("5236 hrs");
  });

  it("says Not stated when the detail is missing or empty", () => {
    expect(shownValue(details, "Serial Number")).toBe(NOT_STATED);
    expect(shownValue([{ label: "Location", value: " " }], "Location")).toBe(
      NOT_STATED,
    );
  });

  it.each(["0 hrs", "0", "0.0 hrs", ""])(
    "never shows a zero total time (%j)",
    (value) => {
      expect(shownValue([{ label: "Total Time", value }], "Total Time")).toBe(
        NOT_STATED,
      );
    },
  );

  it("keeps a figure that only starts with zero", () => {
    expect(
      shownValue([{ label: "Total Time", value: "05 hrs" }], "Total Time"),
    ).toBe("05 hrs");
    expect(
      shownValue([{ label: "Total Time", value: "1020 hrs" }], "Total Time"),
    ).toBe("1020 hrs");
  });
});

describe("paging", () => {
  const items = Array.from({ length: 30 }, (_, i) => i);

  it("shows a page, then more, never past the end", () => {
    expect(visibleItems(items, PAGE_SIZE)).toHaveLength(12);
    expect(nextShown(12, 30)).toBe(24);
    expect(nextShown(24, 30)).toBe(30);
    expect(visibleItems(items, 99)).toHaveLength(30);
  });
});
