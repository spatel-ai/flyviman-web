// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { THEME_SCRIPT } from "@/components/theme/theme-script";
import { HERO_V1_SCRIPT } from "@/features/home-v1/hero-script";
import { HERO_SCRIPT, STILL_POSTER_SCRIPT } from "@/features/home/hero-script";
import { inlineScriptHashes } from "./inline-scripts";

describe("inlineScriptHashes", () => {
  it("hashes exactly the inline scripts the pages render", async () => {
    const expected = [
      THEME_SCRIPT,
      HERO_SCRIPT,
      STILL_POSTER_SCRIPT,
      HERO_V1_SCRIPT,
    ].map(
      (text) =>
        `'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`,
    );
    expect(await inlineScriptHashes()).toEqual(expected);
  });
});
