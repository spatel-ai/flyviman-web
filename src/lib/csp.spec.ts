// @vitest-environment node
import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, cspHeaderName, type CspOptions } from "./csp";

const BASE: CspOptions = {
  apiOrigins: [],
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
  it("lets prerendered pages run only this site's scripts, with no eval", () => {
    expect(parse(contentSecurityPolicy(BASE)).get("script-src")).toEqual([
      "'self'",
      "'unsafe-inline'",
    ]);
  });

  it("locks down everything other than scripts", () => {
    const policy = parse(contentSecurityPolicy(BASE));
    expect(policy.get("default-src")).toEqual(["'self'"]);
    expect(policy.get("frame-ancestors")).toEqual(["'none'"]);
    expect(policy.get("frame-src")).toEqual(["'none'"]);
    expect(policy.get("object-src")).toEqual(["'none'"]);
    expect(policy.get("base-uri")).toEqual(["'self'"]);
    expect(policy.get("form-action")).toEqual(["'self'"]);
    expect(policy.get("font-src")).toEqual(["'self'"]);
    expect(policy.get("img-src")).toEqual(["'self'", "data:"]);
    expect(policy.get("style-src")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(policy.get("connect-src")).toEqual(["'self'"]);
  });

  it("with a nonce, allows scripts only by nonce or hash", () => {
    const script = parse(
      contentSecurityPolicy({
        ...BASE,
        nonce: "abc123",
        scriptHashes: ["'sha256-x'"],
      }),
    ).get("script-src");
    // 'unsafe-inline' would be ignored beside a nonce, and must not be relied on.
    expect(script).toEqual([
      "'self'",
      "'nonce-abc123'",
      "'sha256-x'",
      "'strict-dynamic'",
    ]);
  });

  it("lets the page call the API and show its storage links", () => {
    const policy = parse(
      contentSecurityPolicy({
        ...BASE,
        apiOrigins: ["https://api.example.com"],
      }),
    );
    expect(policy.get("connect-src")).toEqual([
      "'self'",
      "https://api.example.com",
    ]);
    expect(policy.get("img-src")).toEqual([
      "'self'",
      "data:",
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

describe("cspHeaderName", () => {
  it("switches to report-only with CSP_REPORT_ONLY=1", () => {
    expect(cspHeaderName(false)).toBe("Content-Security-Policy");
    expect(cspHeaderName(true)).toBe("Content-Security-Policy-Report-Only");
  });
});
