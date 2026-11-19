import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./support/api";

/**
 * The Content-Security-Policy (src/lib/csp.ts, set in next.config.ts) must
 * not block anything the site itself runs: the framework's scripts, the
 * inline theme and hero scripts, GSAP's dynamic import and calls to the API.
 */

declare global {
  interface Window {
    __cspViolations: string[];
  }
}

/** Collects every violation and every console error naming the policy. */
function watchViolations(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /Content Security Policy/i.test(message.text())
    )
      errors.push(message.text());
  });
  return errors;
}

async function violations(page: Page, consoleErrors: string[]) {
  const reported = await page.evaluate(() => window.__cspViolations);
  return [...reported, ...consoleErrors];
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      window.__cspViolations.push(
        `${event.violatedDirective} blocked ${event.blockedURI || "inline"}`,
      );
    });
  });
});

test("every page carries the enforced policy; Razorpay only on payment", async ({
  request,
}) => {
  const policy = async (path: string) =>
    (await request.get(path, { maxRedirects: 0 })).headers()[
      "content-security-policy"
    ] ?? "";
  for (const path of ["/", "/contact", "/login", "/register"]) {
    const value = await policy(path);
    expect(value, path).toContain("script-src 'self' 'unsafe-inline'");
    expect(value, path).toContain("frame-ancestors 'none'");
    expect(value, path).not.toContain("unsafe-eval");
    expect(value, path).not.toContain("razorpay");
  }
  // Signed out, the payment page redirects to sign-in, with the policy.
  expect(await policy("/book/FV-1/payment")).toContain(
    "https://checkout.razorpay.com",
  );
});

test("the home page and its hero film run with no violations", async ({
  page,
}, info) => {
  const errors = watchViolations(page);
  await page.goto("/");
  const root = page.locator("html");
  // Set by the inline hero script, then by React once it has hydrated.
  await expect(root).toHaveAttribute("data-hero-film", "");
  await expect(root).toHaveAttribute("data-hero-live", "");
  if (info.project.name === "desktop") {
    // GSAP is a dynamic import: it sets the footer wordmark's start state.
    await expect(page.locator(".site-footer__wordmark")).toHaveCSS(
      "opacity",
      "0.2",
    );
  }
  await page.evaluate(() =>
    window.scrollTo({ top: document.documentElement.scrollHeight }),
  );
  await page.waitForLoadState("networkidle");
  expect(await violations(page, errors)).toEqual([]);
});

for (const path of ["/search", "/contact", "/login"]) {
  test(`${path} runs with no violations`, async ({ page }) => {
    const errors = watchViolations(page);
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await violations(page, errors)).toEqual([]);
  });
}

test("the sign-in form becomes usable, so the page hydrated", async ({
  page,
}) => {
  await page.goto("/login");
  // Submit buttons stay disabled until the page has hydrated (D-095).
  await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
});

test("an admin page loads its data with no violations", async ({ page }) => {
  const errors = watchViolations(page);
  await signIn(page, "superAdmin", "/admin/operators");
  await expect(page).toHaveURL(/\/admin\/operators/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(await violations(page, errors)).toEqual([]);
});

test("the theme script sets a stored theme before any bundle runs", async ({
  page,
}) => {
  const errors = watchViolations(page);
  await page.addInitScript(() =>
    localStorage.setItem("flyviman-theme", "dark"),
  );
  // Without the framework's scripts only the inline theme script can set it.
  await page.route("**/_next/static/**/*.js", (route) => route.abort());
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await violations(page, errors)).toEqual([]);
});

test("a script from another origin is blocked and reported", async ({
  page,
}) => {
  await page.goto("/contact");
  await page.evaluate(() => {
    const script = document.createElement("script");
    script.src = "https://example.com/injected.js";
    document.body.append(script);
  });
  await expect
    .poll(() => page.evaluate(() => window.__cspViolations.join("\n")))
    .toMatch(/^script-src\S* blocked https:\/\/example\.com\/injected\.js$/);
});
