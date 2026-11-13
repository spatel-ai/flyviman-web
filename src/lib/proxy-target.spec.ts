import { describe, expect, it } from "vitest";
import { proxyTarget } from "./proxy-target";

describe("proxyTarget", () => {
  it("is unset when empty", () => {
    expect(proxyTarget(undefined, true)).toBeUndefined();
    expect(proxyTarget("  ", true)).toBeUndefined();
  });

  it("keeps the origin and drops a trailing slash or /api/v1", () => {
    expect(proxyTarget("https://api.onrender.com/", true)).toBe(
      "https://api.onrender.com",
    );
    expect(proxyTarget("https://api.onrender.com/api/v1/", true)).toBe(
      "https://api.onrender.com",
    );
  });

  it("refuses http in production, except on this machine", () => {
    expect(() => proxyTarget("http://api.onrender.com", true)).toThrow(/https/);
    expect(proxyTarget("http://localhost:4000", false)).toBe(
      "http://localhost:4000",
    );
    expect(proxyTarget("http://localhost:4000", true)).toBe(
      "http://localhost:4000",
    );
  });

  it("refuses anything but an origin", () => {
    for (const bad of [
      "api.onrender.com",
      "ftp://api.onrender.com",
      "https://api.onrender.com/other",
      "https://user:pass@api.onrender.com",
      "https://api.onrender.com/?x=1",
    ]) {
      expect(() => proxyTarget(bad, true)).toThrow();
    }
  });
});
