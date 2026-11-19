import { expect, test, type Page } from "@playwright/test";
import {
  ACCOUNTS,
  expectNoSidewaysScroll,
  signIn,
  uniqueEmail,
} from "./support/api";

test.describe("route protection", () => {
  for (const path of ["/admin", "/admin/operators", "/operator", "/account"]) {
    test(`a visitor who is not signed in is sent from ${path} to sign-in`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page).toHaveURL(`/login?next=${encodeURIComponent(path)}`);
      await expect(
        page.getByRole("heading", { level: 1, name: "Sign in" }),
      ).toBeVisible();
    });
  }

  test("a customer cannot open the admin portal", async ({ page }) => {
    await signIn(page, "customer");
    await expect(page).toHaveURL("/");

    await page.goto("/admin");
    // Sent home without the admin shell ever being shown.
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("navigation", { name: "Admin navigation" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { level: 1, name: /your trusted partner/i }),
    ).toBeVisible();
  });

  test("a customer who was heading for the admin portal lands on their own home", async ({
    page,
  }) => {
    await signIn(page, "customer", "/admin");
    await expect(page).toHaveURL("/");
  });

  test("an operator cannot open the admin portal or a customer account", async ({
    page,
  }) => {
    await signIn(page, "operatorAdmin");
    await expect(page).toHaveURL("/operator/onboarding");
    await expect(
      page.getByRole("heading", { level: 1, name: "Company and documents" }),
    ).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/operator/);
    await page.goto("/account");
    await expect(page).toHaveURL(/\/operator/);
  });

  test("a sign-in link cannot send the user to another site", async ({
    page,
  }) => {
    await signIn(page, "superAdmin", "https://evil.example/admin");
    await expect(page).toHaveURL("/admin");
  });
});

test.describe("signing in", () => {
  test("a super administrator signs in and sees the admin dashboard", async ({
    page,
  }) => {
    await signIn(page, "superAdmin", "/admin");

    await expect(page).toHaveURL("/admin");
    await expect(page).toHaveTitle("Admin portal · Flyviman");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeVisible();
    await expectNoSidewaysScroll(page);
  });

  test("returns to the page the user was heading for", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fusers$/);
    await page
      .getByRole("textbox", { name: "Email" })
      .fill(ACCOUNTS.superAdmin.email);
    await page
      .getByRole("textbox", { name: "Password" })
      .fill(ACCOUNTS.superAdmin.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/admin/users");
    await expect(
      page.getByRole("heading", { level: 1, name: "Users" }),
    ).toBeVisible();
  });

  test("a wrong password shows one message that does not say which part was wrong", async ({
    page,
  }) => {
    await signIn(page, {
      email: ACCOUNTS.customer.email,
      password: "not-the-password",
    });
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "The email or password is not correct." }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("the form explains what is missing and can be used with the keyboard", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("textbox", { name: "Email" }).focus();
    await page.keyboard.type("not-an-email");
    await page.keyboard.press("Enter");

    const email = page.getByRole("textbox", { name: "Email" });
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(
      page.getByText("Enter a valid email address.", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Enter your password.", { exact: true }).first(),
    ).toBeVisible();
  });

  test("switching to a mobile code keeps the card top still", async ({
    page,
  }) => {
    await page.goto("/login");
    const heading = page.getByRole("heading", { level: 1, name: "Sign in" });
    await expect(heading).toBeVisible();
    const before = await heading.boundingBox();
    expect(before).toBeTruthy();

    await page.getByRole("tab", { name: "Mobile number" }).click();
    await expect(
      page.getByRole("textbox", { name: "Mobile number" }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email" })).toHaveCount(0);

    const after = await heading.boundingBox();
    expect(after).toBeTruthy();
    expect(Math.abs(after!.y - before!.y)).toBeLessThan(2);
  });

  test("under reduced motion the mobile panel is fully visible at once", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/login");
    await page.getByRole("tab", { name: "Mobile number" }).click();
    const panel = page.getByRole("tabpanel");
    await expect(panel).toBeVisible();
    await expect(panel).toHaveCSS("opacity", "1");
  });

  test("a mobile number without a country code is explained under the field", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("tab", { name: "Mobile number" }).click();
    await page
      .getByRole("textbox", { name: "Mobile number" })
      .fill("9876543210");
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(
      page
        .getByText(
          "Enter the number with its country code, for example +919876543210.",
          { exact: true },
        )
        .first(),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("someone already signed in is taken past the sign-in page", async ({
    page,
  }) => {
    await signIn(page, "superAdmin");
    await expect(page).toHaveURL("/admin");
    await page.goto("/login");
    await expect(page).toHaveURL("/admin");
  });
});

/** Follows a portal link, from the drawer on a phone. */
async function openPortalLink(page: Page, name: string) {
  const menu = page.getByRole("button", { name: "Open navigation" });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name })
    .click();
}

test.describe("an idle session", () => {
  test.beforeEach(async ({ page, context }) => {
    await signIn(page, "superAdmin");
    await expect(page).toHaveURL("/admin");
    // The sign-in page's redirect must have finished, or it can land after
    // the test's own navigation and send the browser back to /admin.
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeVisible();
    // What the browser holds after 15 idle minutes: the access cookie has
    // expired, the refresh cookie has not.
    const cookies = await context.cookies();
    await context.clearCookies({ name: "access_token" });
    expect(cookies.some((cookie) => cookie.name === "refresh_token")).toBe(
      true,
    );
  });

  test("is renewed when the user opens a protected page", async ({
    page,
    context,
  }) => {
    await page.goto("/admin/users");
    await expect(page).toHaveURL("/admin/users");
    await expect(
      page.getByRole("heading", { level: 1, name: "Users" }),
    ).toBeVisible();
    const renewed = await context.cookies();
    expect(renewed.some((cookie) => cookie.name === "access_token")).toBe(true);
  });

  // The page's links are prefetched together, and each refresh token works
  // once. A prefetch could win the rotation and then be cancelled by the
  // navigation, taking the new cookies with it, while the page the user
  // opened lost and was sent to sign-in (D-111). The losers now receive the
  // winner's pair.
  test("is renewed when link prefetches race the page the user opens", async ({
    page,
    context,
  }) => {
    await page.evaluate(() => {
      for (const path of ["/admin/operators", "/admin/pricing/rules"]) {
        void fetch(`${path}?_rsc=prefetch`, {
          headers: {
            rsc: "1",
            "next-router-prefetch": "1",
            "next-router-segment-prefetch": "/_tree",
          },
        });
      }
    });
    await page.goto("/admin/users");
    await expect(page).toHaveURL("/admin/users");
    await expect(
      page.getByRole("heading", { level: 1, name: "Users" }),
    ).toBeVisible();
    const renewed = await context.cookies();
    expect(renewed.some((cookie) => cookie.name === "access_token")).toBe(true);
  });

  test("is renewed when the user follows a link in the portal", async ({
    page,
    context,
  }) => {
    // The links' prefetches may still be on their way; the click must win
    // whatever they do.
    await openPortalLink(page, "Users");
    await expect(page).toHaveURL("/admin/users");
    await expect(
      page.getByRole("heading", { level: 1, name: "Users" }),
    ).toBeVisible();
    // The heading can come from a prefetch at once; the session is renewed
    // by the navigation's own request, which may still be on its way.
    await expect
      .poll(async () =>
        (await context.cookies()).some(
          (cookie) => cookie.name === "access_token",
        ),
      )
      .toBe(true);
    await expect(page).toHaveURL("/admin/users");
  });

  test("can still be signed out, and stays signed out", async ({ page }) => {
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/login");

    // The refresh cookie must not bring the session back.
    await page.goto("/admin");
    await expect(page).toHaveURL("/login?next=%2Fadmin");
  });
});

// The account pages have their own layout, which checks the session, so
// a link to them from the customer site is prefetched without passing the
// proxy and the session gate is reached only by the click itself (D-111).
test("an idle customer is renewed when following a link into their account", async ({
  page,
  context,
}, info) => {
  await signIn(page, "customer");
  await expect(page).toHaveURL("/");
  await context.clearCookies({ name: "access_token" });

  if (info.project.name === "mobile") {
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Account" })
      .click();
  } else {
    // A click before hydration is lost (D-116): open until it shows.
    const profile = page.getByRole("menuitem", { name: "Profile" });
    await expect(async () => {
      await page.getByRole("button", { name: "Account menu" }).click();
      await expect(profile).toBeVisible({ timeout: 1_000 });
    }).toPass();
    await profile.click();
  }
  await expect(page).toHaveURL("/account");
  await expect(
    page.getByRole("heading", { level: 1, name: "Profile" }),
  ).toBeVisible();
  await expect
    .poll(async () =>
      (await context.cookies()).some(
        (cookie) => cookie.name === "access_token",
      ),
    )
    .toBe(true);
  await expect(page).toHaveURL("/account");
});

test("every page is sent with headers that stop it being framed or sniffed", async ({
  request,
}) => {
  const headers = (await request.get("/login")).headers();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-powered-by"]).toBeUndefined();
  expect(
    (await request.get("/reset-password")).headers()["referrer-policy"],
  ).toBe("no-referrer");
});

test("an unknown address shows the not-found page", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Page not found" }),
  ).toBeVisible();
});

test.describe("the admin shell", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, "superAdmin");
    await expect(page).toHaveURL("/admin");
  });

  test("navigation marks the current page and reaches the other sections", async ({
    page,
    isMobile,
  }) => {
    if (isMobile)
      await page.getByRole("button", { name: "Open navigation" }).click();
    const nav = page.getByRole("navigation", { name: "Admin navigation" });
    await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await nav.getByRole("link", { name: "Operators" }).click();
    await expect(page).toHaveURL("/admin/operators");
    await expect(
      page.getByRole("heading", { level: 1, name: "Operators" }),
    ).toBeVisible();

    if (isMobile) {
      // The drawer closed when the link was followed.
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.getByRole("button", { name: "Open navigation" }).click();
    }
    await expect(
      page
        .getByRole("navigation", { name: "Admin navigation" })
        .getByRole("link", { name: "Operators" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("the theme can be forced and is remembered", async ({ page }) => {
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("radio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const dark = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(dark).toBe("rgb(0, 0, 0)");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("signing out ends the session", async ({ page }) => {
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/login");

    await page.goto("/admin");
    await expect(page).toHaveURL("/login?next=%2Fadmin");
  });
});

test("the home page offers sign-in to a visitor and an account menu to a customer", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  // On phones the tab bar holds Sign in and the login page offers the rest.
  if (info.project.name !== "mobile") {
    await expect(
      page.getByRole("link", { name: "Create account" }),
    ).toBeVisible();
  }

  await signIn(page, "customer");
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("button", { name: "Account menu" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
});

test.describe("sign-in lockout through this site's /api/v1 proxy", () => {
  // Only the proxied runs go through this site's /api/v1 proxy. x-real-ip
  // stands in for the address Vercel sets.
  test.skip(!process.env.API_PROXY, "needs API_PROXY=1 or API_PROXY=signed");
  const signed = process.env.API_PROXY === "signed";

  test(
    signed
      ? "with the shared secret, one visitor's failures lock the account for that visitor only"
      : "without the shared secret, every visitor is this host, as before",
    async ({ request }) => {
      const email = uniqueEmail("lockout");
      const attempt = (headers: Record<string, string>) =>
        request.post("/api/v1/auth/login", {
          headers,
          data: { email, password: "not-the-password" },
        });

      const guesser = { "x-real-ip": "198.51.100.10" };
      for (let failure = 0; failure < 10; failure += 1) {
        expect((await attempt(guesser)).status()).toBe(401);
      }
      expect((await attempt(guesser)).status()).toBe(429);

      // Another visitor reaching the API through the same host.
      const other = await attempt({ "x-real-ip": "198.51.100.11" });
      expect(other.status()).toBe(signed ? 401 : 429);
      if (!signed) return;
      // A visitor cannot claim to be someone else with the API's header: the
      // proxy drops it, and the API would not believe it unsigned.
      expect(
        (
          await attempt({
            "x-real-ip": "198.51.100.12",
            "x-flyviman-client-ip": "198.51.100.10 0 forged",
          })
        ).status(),
      ).toBe(401);
    },
  );
});
