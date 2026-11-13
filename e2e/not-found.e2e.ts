import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { signIn, type AccountName } from "./support/api";
import { dynamicRoutes, fill } from "./support/routes";

/**
 * Not-found guard (D-093). Every page with a dynamic segment is found by
 * reading `src/app`, so a new one is checked here without being listed.
 *
 * - Public pages must answer status 404 on the first visit to an address
 *   that does not exist (`src/proxy.ts` answers them; the pages stream, so
 *   `notFound()` alone would send 200).
 * - Signed-in pages load their record in the browser, so they cannot set
 *   the status; they must say the record is not found, both for an address
 *   that is not an id and for an id that matches nothing.
 */

/** Who can open each signed-in surface. */
const ACCOUNT_FOR: Record<string, AccountName> = {
  "/admin": "ops",
  "/operator": "operatorAdmin",
  "/account": "customer",
  "/trips": "customer",
  "/book": "customer",
};

const NOT_FOUND = /not found|cannot be found|doesn.t exist/i;

test("an unknown address answers 404", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
});

for (const { pattern, signedIn, loadsRecord } of dynamicRoutes()) {
  if (!loadsRecord) {
    test(`${pattern}: an unknown address answers 404 on the first visit`, async ({
      page,
    }) => {
      // A fresh value each run, so a cached result cannot hide the first visit.
      const response = await page.goto(fill(pattern, `missing-${Date.now()}`));
      expect(response?.status()).toBe(404);
      await expect(
        page.getByRole("heading", { level: 1, name: "Page not found" }),
      ).toBeVisible();
    });
    continue;
  }

  if (!signedIn) {
    test(`${pattern}: an address that matches no record says so`, async ({
      page,
    }) => {
      await page.goto(fill(pattern, randomUUID()));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        NOT_FOUND,
      );
    });
    continue;
  }

  const prefix = `/${pattern.split("/")[1]}`;
  const account = ACCOUNT_FOR[prefix];

  test(`${pattern}: an address that matches no record says so`, async ({
    page,
  }) => {
    expect(account, `add an account for ${prefix} to ACCOUNT_FOR`).toBeTruthy();
    await signIn(page, account, fill(pattern, "not-an-id"));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(NOT_FOUND);

    await page.goto(fill(pattern, randomUUID()));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(NOT_FOUND);
  });
}
