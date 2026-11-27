import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(`${__dirname}/globals.css`, "utf8");

/** Tokens of one theme, read from globals.css. */
function tokens(block: ":root {" | ':root[data-theme="dark"] {') {
  const start = CSS.indexOf(block);
  const body = CSS.slice(start, CSS.indexOf("\n}", start));
  const map: Record<string, string> = {};
  for (const [, name, value] of body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/g))
    map[name] = value;
  return map;
}

type RGB = [number, number, number];
const rgb = (hex: string): RGB =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const channel = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: RGB) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
function contrast(a: RGB, b: RGB) {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
/** `top` at `alpha` over `bottom`. */
const over = (top: RGB, bottom: RGB, alpha: number): RGB =>
  top.map((v, i) => v * alpha + bottom[i] * (1 - alpha)) as RGB;

const THEMES = {
  light: tokens(":root {"),
  dark: tokens(':root[data-theme="dark"] {'),
};
const TONES = ["accent", "success", "warning", "danger", "info"] as const;

describe.each(Object.entries(THEMES))("%s theme contrast", (_, t) => {
  const grounds = [t.background, t.surface, t["surface-raised"]].map(rgb);

  it.each(TONES)("%s text reads at 4.5:1 on its 12% badge tint", (tone) => {
    for (const ground of grounds)
      expect(
        contrast(rgb(t[tone]), over(rgb(t[tone]), ground, 0.12)),
      ).toBeGreaterThanOrEqual(4.5);
  });

  it("neutral badge text (muted on surface) reads at 4.5:1", () => {
    expect(contrast(rgb(t.muted), rgb(t.surface))).toBeGreaterThanOrEqual(4.5);
  });

  it("accent text reads at 4.5:1 on the active-link highlight (10%)", () => {
    for (const ground of grounds)
      expect(
        contrast(rgb(t.accent), over(rgb(t.accent), ground, 0.1)),
      ).toBeGreaterThanOrEqual(4.5);
  });

  it("the theme switch's inactive label reads at 4.5:1 on its track", () => {
    for (const ground of grounds) {
      const track = over(rgb(t.border), ground, 0.5);
      const label = over(rgb(t.foreground), track, 0.8);
      expect(contrast(label, track)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("a control outline is 3:1 against its fill (WCAG 1.4.11)", () => {
    expect(
      contrast(rgb(t["border-control"]), rgb(t.surface)),
    ).toBeGreaterThanOrEqual(3);
  });

  it("a locked field's text reads at 4.5:1 on its fill", () => {
    expect(contrast(rgb(t.muted), rgb(t.surface))).toBeGreaterThanOrEqual(4.5);
  });
});
