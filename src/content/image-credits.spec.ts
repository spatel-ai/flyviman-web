import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { IMAGES, LICENCE_URLS } from "./image-credits";

const entries = Object.values(IMAGES);

describe("image credits", () => {
  it("credits every photograph stored with the site", () => {
    // Pictures only: macOS can add a .DS_Store to the folder.
    const files = readdirSync(resolve(__dirname, "images")).filter((name) =>
      /\.(jpe?g|png|webp|avif)$/i.test(name),
    );
    expect(entries).toHaveLength(files.length);
  });

  it("gives every image alt text, a photographer and a source page", () => {
    for (const image of entries) {
      expect(image.alt.length).toBeGreaterThan(10);
      expect(image.photographer).not.toBe("");
      expect(image.sourceUrl).toMatch(/^https:\/\/unsplash\.com\/photos\//);
      expect(LICENCE_URLS[image.licence]).toMatch(/^https:\/\//);
      expect(image.added).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("does not list the same photograph twice", () => {
    const sources = entries.map((image) => image.sourceUrl);
    expect(new Set(sources).size).toBe(sources.length);
  });
});
