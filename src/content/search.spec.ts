import { describe, expect, it } from "vitest";
import { areaOf, POPULAR_LOCATIONS, SEARCH_LANDING } from "./search";

describe("search content", () => {
  it("names every popular route's places, so a card never shows only codes", () => {
    const known = new Set(POPULAR_LOCATIONS.map((entry) => entry.code));
    for (const route of SEARCH_LANDING.popularRoutes.routes) {
      expect(known, `${route.from} needs a popular entry`).toContain(
        route.from,
      );
      expect(known, `${route.to} needs a popular entry`).toContain(route.to);
    }
  });

  it("uses the everyday name of a place", () => {
    expect(areaOf("GOI")).toBe("Goa");
    expect(areaOf("DEL")).toBe("Delhi");
    expect(areaOf("XYZ")).toBe("XYZ");
  });
});
