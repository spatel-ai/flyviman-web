// @vitest-environment node
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

/** Next.js matcher syntax, as far as `config.matcher` uses it. */
function matches(path: string): boolean {
  return config.matcher.some((matcher) =>
    new RegExp(
      `^${matcher
        .replace(/\/:[a-z]+\*/gi, "(?:/.*)?")
        .replace(/:[a-z]+/gi, "[^/]+")}/?$`,
    ).test(path),
  );
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

  for (const { pattern, signedIn } of routes) {
    if (signedIn) {
      it(`${pattern} sits behind sign-in`, () => {
        expect(
          matches(fill(pattern, "anything")),
          `${pattern} is not protected by config.matcher in src/proxy.ts`,
        ).toBe(true);
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

  it("keeps the signed-in prefixes in step with the matcher", () => {
    for (const prefix of SIGNED_IN_PREFIXES) {
      expect(matches(`${prefix}/anything`), prefix).toBe(true);
    }
  });
});
