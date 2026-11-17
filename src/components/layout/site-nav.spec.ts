import { describe, expect, it } from "vitest";
import { CHARTER_HREF, LEGAL_NAV, MORE_NAV, SEARCH_NAV } from "./site-nav";

const HEADER_HREFS = [
  CHARTER_HREF,
  SEARCH_NAV.href,
  ...MORE_NAV.map((i) => i.href),
];

describe("customer site navigation", () => {
  it("links each destination from one place: no href in both header and footer", () => {
    const footer = new Set(LEGAL_NAV.map((item) => item.href));
    expect(HEADER_HREFS.filter((href) => footer.has(href))).toEqual([]);
  });

  it("does not repeat a destination inside the header", () => {
    expect(new Set(HEADER_HREFS).size).toBe(HEADER_HREFS.length);
  });

  it("gives every More item an icon", () => {
    for (const item of MORE_NAV) expect(item.icon).toBeTruthy();
  });
});
