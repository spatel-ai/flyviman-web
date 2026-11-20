import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext } from "@playwright/test";
import { API_URL, expectNoSidewaysScroll, signIn } from "./support/api";

/** Banner and questions the content team published, shown to visitors. */

async function admin(
  context: BrowserContext,
  path: string,
  init?: {
    method?: string;
    data?: unknown;
  },
) {
  const csrf = (await context.cookies()).find(
    (cookie) => cookie.name === "csrf_token",
  )?.value;
  const response = await context.request.fetch(`${API_URL}${path}`, {
    method: init?.method ?? "GET",
    data: init?.data,
    headers: { "X-CSRF-Token": csrf ?? "" },
  });
  expect(response.ok(), `${init?.method ?? "GET"} ${path}`).toBe(true);
  return response.status() === 204 ? null : (await response.json()).data;
}

test("a published banner shows on the home page as plain text, and leaves when unpublished", async ({
  page,
  context,
}) => {
  test.slow();
  await signIn(page, "ops", "/admin/content");
  await expect(
    page.getByRole("heading", { level: 1, name: "Content" }),
  ).toBeVisible();
  const title = `Winter fares ${randomUUID().slice(0, 8)}`;
  const banner = await admin(context, "admin/content/banners", {
    method: "POST",
    data: { title, body: "Mumbai to Goa <b>from today</b>.", published: true },
  });
  try {
    await page.goto("/");
    const shown = page.getByRole("complementary", { name: "Announcement" });
    await expect(shown).toContainText(title);
    // Text, not markup: the angle brackets are shown as typed.
    await expect(shown).toContainText("<b>from today</b>");
    await expect(shown.locator("b")).toHaveCount(0);
    await expectNoSidewaysScroll(page);

    await admin(context, `admin/content/banners/${banner.id}`, {
      method: "PATCH",
      data: { published: false },
    });
    await page.reload();
    await expect(page.getByText(title)).toHaveCount(0);
  } finally {
    await admin(context, `admin/content/banners/${banner.id}`, {
      method: "DELETE",
    });
  }
});

test("a published question shows on the services page after the written ones", async ({
  page,
  context,
}) => {
  test.slow();
  await signIn(page, "ops", "/admin/content");
  await expect(
    page.getByRole("heading", { level: 1, name: "Content" }),
  ).toBeVisible();
  const question = `Can I bring a pet ${randomUUID().slice(0, 8)}?`;
  const faq = await admin(context, "admin/content/faqs", {
    method: "POST",
    data: { title: question, body: "Yes, on most charters.", published: true },
  });
  try {
    await page.goto("/services");
    const main = page.getByRole("main");
    await expect(
      main.getByRole("heading", { level: 3, name: question }),
    ).toBeAttached();
    await main.getByText(question).click();
    await expect(main.getByText("Yes, on most charters.")).toBeVisible();
    await expectNoSidewaysScroll(page);
  } finally {
    await admin(context, `admin/content/faqs/${faq.id}`, { method: "DELETE" });
  }
});
