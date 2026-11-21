import { describe, expect, it } from "vitest";
import { isRestricted } from "./restricted";

const base = { restricted: true, before: null, after: null, reason: null };

describe("isRestricted", () => {
  it("is true for a flagged record with nothing returned", () => {
    expect(isRestricted(base)).toBe(true);
  });

  it("is false when contents came back or the row is not flagged", () => {
    expect(isRestricted({ ...base, reason: "Q4" })).toBe(false);
    expect(isRestricted({ ...base, restricted: false })).toBe(false);
  });
});
