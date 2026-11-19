// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CLIENT_ADDRESS_HEADER,
  proxySecret,
  signClientAddress,
  visitorAddressHeaders,
} from "./client-address";

const SECRET = "test-secret-of-at-least-32-characters!!";
/** The same vector is in flyviman-api's client-address.middleware.spec.ts. */
const VECTOR =
  "203.0.113.7 1763510400 Sk8T9XctyR94OHpLNZrh7MhLPszOEZbDJTV0rigKEXM";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("signClientAddress", () => {
  it("signs exactly as the API verifies", async () => {
    expect(await signClientAddress("203.0.113.7", SECRET, 1763510400)).toBe(
      VECTOR,
    );
  });
});

describe("proxySecret", () => {
  it("is required in production when /api/v1 is proxied", () => {
    expect(() => proxySecret(undefined, true, true)).toThrow(
      /WEB_PROXY_SECRET/,
    );
    expect(() => proxySecret(" ", true, true)).toThrow(/WEB_PROXY_SECRET/);
  });

  it("is optional otherwise", () => {
    expect(proxySecret(undefined, false, true)).toBeUndefined();
    expect(proxySecret(undefined, true, false)).toBeUndefined();
  });

  it("refuses a short secret anywhere", () => {
    expect(() => proxySecret("short", false, false)).toThrow(/32/);
    expect(proxySecret(SECRET, true, true)).toBe(SECRET);
  });
});

describe("visitorAddressHeaders", () => {
  const from = (headers: Record<string, string>) =>
    visitorAddressHeaders(new Headers(headers));

  it("signs the address the host saw", async () => {
    vi.stubEnv("WEB_PROXY_SECRET", SECRET);
    const signed = (await from({ "x-real-ip": "203.0.113.7" }))[
      CLIENT_ADDRESS_HEADER
    ];
    const [address, time] = signed.split(" ");
    expect(address).toBe("203.0.113.7");
    expect(signed).toBe(
      await signClientAddress("203.0.113.7", SECRET, Number(time)),
    );
  });

  it("sends nothing without a secret, so local development is unchanged", async () => {
    vi.stubEnv("WEB_PROXY_SECRET", "");
    expect(await from({ "x-real-ip": "203.0.113.7" })).toEqual({});
  });

  it("sends nothing without a usable address", async () => {
    vi.stubEnv("WEB_PROXY_SECRET", SECRET);
    expect(await from({})).toEqual({});
    expect(await from({ "x-real-ip": "203.0.113.7 1 forged" })).toEqual({});
  });
});

describe("the /api/v1 proxy", () => {
  async function proxied(headers: Record<string, string>) {
    vi.stubEnv("API_PROXY_TARGET", "http://localhost:4999");
    vi.stubEnv("WEB_PROXY_SECRET", SECRET);
    const { proxy } = await import("../proxy");
    const response = await proxy(
      new NextRequest("http://localhost:3000/api/v1/auth/login?x=1", {
        method: "POST",
        headers,
      }),
    );
    // Next.js passes overridden request headers on as x-middleware-request-*.
    return {
      destination: response.headers.get("x-middleware-rewrite"),
      sent: response.headers.get(
        `x-middleware-request-${CLIENT_ADDRESS_HEADER}`,
      ),
    };
  }

  it("rewrites to the API and signs the visitor's address", async () => {
    const { destination, sent } = await proxied({ "x-real-ip": "203.0.113.7" });
    expect(destination).toBe("http://localhost:4999/api/v1/auth/login?x=1");
    expect(sent).toMatch(/^203\.0\.113\.7 \d+ [\w-]{43}$/);
  });

  it("drops a header the visitor made up", async () => {
    const forged = "198.51.100.1 1763510400 forged";
    const withAddress = await proxied({
      "x-real-ip": "203.0.113.7",
      [CLIENT_ADDRESS_HEADER]: forged,
    });
    expect(withAddress.sent).toMatch(/^203\.0\.113\.7 /);

    const withoutAddress = await proxied({ [CLIENT_ADDRESS_HEADER]: forged });
    expect(withoutAddress.sent).toBeNull();
  });

  it("leaves /api/v1 alone when nothing is proxied", async () => {
    vi.stubEnv("API_PROXY_TARGET", "");
    const { proxy } = await import("../proxy");
    const response = await proxy(
      new NextRequest("http://localhost:3000/api/v1/health"),
    );
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
