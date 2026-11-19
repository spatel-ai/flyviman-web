// @vitest-environment node
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import {
  SIGNED_IN_PREFIXES,
  allRoutes,
  dynamicRoutes,
  fill,
} from "../e2e/support/routes";
import { AIRCRAFT_SALES } from "./content/aircraft-sales";
import { POLICY_SLUGS } from "./features/legal/policies";
import { config, proxy } from "./proxy";

function matches(path: string): boolean {
  return unstable_doesMiddlewareMatch({
    config,
    url: new URL(path, "http://localhost:3000").toString(),
  });
}

async function run(path: string) {
  return proxy(new NextRequest(new URL(path, "http://localhost:3000")));
}

const isNotFound = (response: Response) =>
  new URL(
    response.headers.get("x-middleware-rewrite") ?? "http://x/",
  ).pathname.startsWith("/_no-such-page");

// D-093: a public page addressed by a slug streams, so `notFound()` alone
// sends the first visit with status 200. Every such page must be answered
// by the proxy instead. A new page of this kind fails here until it is
// added to `KNOWN_SLUGS` in `src/proxy.ts`.
describe("not-found guard for dynamic pages", () => {
  const routes = dynamicRoutes();

  it("finds the dynamic pages", () => {
    expect(routes.map((route) => route.pattern)).toEqual(
      expect.arrayContaining(["/aircraft-sales/[slug]", "/legal/[slug]"]),
    );
  });

  for (const { pattern, signedIn, loadsRecord } of routes) {
    if (loadsRecord && !signedIn) continue; // e2e/not-found.e2e.ts covers it
    if (signedIn) {
      it(`${pattern} sits behind sign-in`, async () => {
        const path = fill(pattern, "anything");
        const fix = `${pattern} is not protected by src/proxy.ts`;
        expect(matches(path), fix).toBe(true);
        expect((await run(path)).headers.get("location"), fix).toContain(
          "/login",
        );
      });
    } else {
      it(`${pattern} answers 404 for an unknown address`, async () => {
        const path = fill(pattern, "not-a-real-page");
        const fix = `${pattern} can answer 200 for an address that does not exist: add it to KNOWN_SLUGS, SLUG_PAGE and config.matcher in src/proxy.ts (D-093)`;
        expect(matches(path), fix).toBe(true);
        expect(isNotFound(await run(path)), fix).toBe(true);
      });
    }
  }

  it("never turns away a page that exists", async () => {
    // A new page beside a slug page (like /legal/image-credits) must be
    // added to `KNOWN_SLUGS` too, or the proxy would answer 404 for it.
    const pages = allRoutes().filter((route) => !route.includes("["));
    for (const path of pages) {
      expect(
        isNotFound(await run(path)),
        `${path} exists but the proxy answers 404: add it to KNOWN_SLUGS in src/proxy.ts`,
      ).toBe(false);
    }
  });

  it("lets every known listing and policy through", async () => {
    const known = [
      ...AIRCRAFT_SALES.listings.flatMap((listing) =>
        listing.slug ? [`/aircraft-sales/${listing.slug}`] : [],
      ),
      ...POLICY_SLUGS.map((slug) => `/legal/${slug}`),
      "/legal/image-credits",
    ];
    for (const path of known) {
      expect(isNotFound(await run(path)), path).toBe(false);
    }
  });

  it("keeps the signed-in prefixes behind sign-in", async () => {
    for (const prefix of SIGNED_IN_PREFIXES) {
      for (const path of [prefix, `${prefix}/anything`, `${prefix}/a.b`]) {
        expect(matches(path), path).toBe(true);
        expect((await run(path)).headers.get("location"), path).toContain(
          "/login",
        );
      }
    }
  });

  it("answers 404 for an unknown slug with a dot in it", async () => {
    for (const path of ["/legal/x.y", "/aircraft-sales/x.y"]) {
      expect(matches(path), path).toBe(true);
      expect(isNotFound(await run(path)), path).toBe(true);
    }
  });
});

describe("Content-Security-Policy", () => {
  const policy = (response: Response) =>
    response.headers.get("content-security-policy") ?? "";
  const nonceOf = (value: string) => /'nonce-([^']+)'/.exec(value)?.[1];

  it("is set on every page, public or protected, with a new nonce", async () => {
    const [home, again, admin] = await Promise.all([
      run("/"),
      run("/"),
      run("/admin"),
    ]);
    expect(nonceOf(policy(home))).toBeTruthy();
    expect(nonceOf(policy(home))).not.toBe(nonceOf(policy(again)));
    expect(policy(admin)).toContain("frame-ancestors 'none'");
  });

  it("hands the same policy to the page being rendered", async () => {
    const response = await run("/contact");
    expect(
      response.headers.get("x-middleware-request-content-security-policy"),
    ).toBe(policy(response));
  });

  it("leaves public pages public and still guards protected ones", async () => {
    expect((await run("/contact")).headers.get("location")).toBeNull();
    expect((await run("/admin")).headers.get("location")).toContain("/login");
  });

  it("allows Razorpay only on the payment page", async () => {
    expect(policy(await run("/book/FV-1/payment"))).toContain(
      "https://checkout.razorpay.com",
    );
    expect(policy(await run("/contact"))).not.toContain("razorpay");
  });

  it("does not touch the API or static files", async () => {
    expect(policy(await run("/api/v1/health"))).toBe("");
    expect(matches("/_next/static/chunks/main.js")).toBe(false);
    expect(matches("/hero/desktop/0001.webp")).toBe(false);
    expect(matches("/search/a.b")).toBe(true);
    expect(matches("/contact")).toBe(true);
  });
});
