// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { THEME_SCRIPT } from "@/components/theme/theme-script";
import { HERO_V1_SCRIPT } from "@/features/home-v1/hero-script";
import { HERO_SCRIPT } from "@/features/home/hero-script";
import {
  contentSecurityPolicy,
  createNonce,
  cspHeaderName,
  inlineScriptHashes,
  isCheckoutPage,
  type CspOptions,
} from "./csp";

const BASE: CspOptions = {
  nonce: "abc123",
  scriptHashes: ["'sha256-x'"],
  checkout: false,
  development: false,
};

/** The directives of a policy, by name. */
function parse(policy: string): Map<string, string[]> {
  return new Map(
    policy.split("; ").map((directive) => {
      const [name, ...sources] = directive.split(" ");
      return [name, sources];
    }),
  );
}

describe("contentSecurityPolicy", () => {
  it("allows scripts only by nonce or hash, and trusts what they load", () => {
    const script = parse(contentSecurityPolicy(BASE)).get("script-src");
    expect(script).toEqual([
      "'self'",
      "'nonce-abc123'",
      "'sha256-x'",
      "'strict-dynamic'",
    ]);
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
  });

  it("locks down framing, plugins, base and form targets", () => {
    const policy = parse(contentSecurityPolicy(BASE));
    expect(policy.get("default-src")).toEqual(["'self'"]);
    expect(policy.get("frame-ancestors")).toEqual(["'none'"]);
    expect(policy.get("frame-src")).toEqual(["'none'"]);
    expect(policy.get("object-src")).toEqual(["'none'"]);
    expect(policy.get("base-uri")).toEqual(["'self'"]);
    expect(policy.get("form-action")).toEqual(["'self'"]);
    expect(policy.get("img-src")).toEqual(["'self'", "data:"]);
    expect(policy.get("style-src")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(policy.get("connect-src")).toEqual(["'self'"]);
  });

  it("adds the API's origin when the browser calls it directly", () => {
    const policy = parse(
      contentSecurityPolicy({ ...BASE, apiOrigin: "https://api.example.com" }),
    );
    expect(policy.get("connect-src")).toEqual([
      "'self'",
      "https://api.example.com",
    ]);
  });

  it("adds Razorpay Checkout only when asked", () => {
    const policy = parse(contentSecurityPolicy({ ...BASE, checkout: true }));
    expect(policy.get("script-src")).toContain("https://checkout.razorpay.com");
    expect(policy.get("frame-src")).toEqual(["https://api.razorpay.com"]);
    expect(policy.get("connect-src")).toContain("https://api.razorpay.com");
    expect(contentSecurityPolicy(BASE)).not.toContain("razorpay");
  });

  it("allows eval in development only", () => {
    const policy = parse(contentSecurityPolicy({ ...BASE, development: true }));
    expect(policy.get("script-src")).toContain("'unsafe-eval'");
  });
});

describe("inlineScriptHashes", () => {
  it("hashes exactly the inline scripts the pages render", async () => {
    const expected = [THEME_SCRIPT, HERO_SCRIPT, HERO_V1_SCRIPT].map(
      (text) =>
        `'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`,
    );
    expect(await inlineScriptHashes()).toEqual(expected);
  });
});

describe("helpers", () => {
  it("makes a new base64 nonce each time", () => {
    const nonce = createNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(createNonce()).not.toBe(nonce);
  });

  it("recognises the payment page only", () => {
    expect(isCheckoutPage("/book/FV-123/payment")).toBe(true);
    expect(isCheckoutPage("/book/FV-123")).toBe(false);
    expect(isCheckoutPage("/book/FV-123/payment/extra")).toBe(false);
    expect(isCheckoutPage("/search")).toBe(false);
  });

  it("switches to report-only with CSP_REPORT_ONLY=1", () => {
    expect(cspHeaderName(false)).toBe("Content-Security-Policy");
    expect(cspHeaderName(true)).toBe("Content-Security-Policy-Report-Only");
  });
});
