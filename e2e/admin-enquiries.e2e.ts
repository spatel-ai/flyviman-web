import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { API_URL, signIn, uniqueEmail } from "./support/api";

/** Sends an enquiry the way the contact page does; returns its message. */
async function sendEnquiry(
  request: import("@playwright/test").APIRequestContext,
) {
  const message = `Admin list check ${randomUUID()}`;
  const response = await request.post(`${API_URL}enquiries`, {
    headers: { "Idempotency-Key": randomUUID() },
    data: {
      name: "Asha Rao",
      email: uniqueEmail("enquiry"),
      topic: "AIRCRAFT_SALES",
      message,
    },
  });
  expect(response.status()).toBe(201);
  return { message, reference: (await response.json()).data.reference };
}

test("operations read an enquiry and mark it handled", async ({
  page,
  request,
}) => {
  const { reference, message } = await sendEnquiry(request);
  await signIn(page, "ops", "/admin/enquiries");
  await expect(
    page.getByRole("heading", { level: 1, name: "Enquiries" }),
  ).toBeVisible();

  await page.getByRole("link", { name: reference }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: reference }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/enquiries\/[0-9a-f-]{36}$/);
  await expect(page.getByText(message)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mark handled" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Mark handled" }).click();
  await expect(page.getByText("Marked as handled").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark handled" })).toHaveCount(
    0,
  );

  // It leaves the "not handled" view and appears under "handled".
  await page.goto("/admin/enquiries?handled=UNHANDLED&topic=AIRCRAFT_SALES");
  await expect(page.getByRole("heading", { name: "Enquiries" })).toBeVisible();
  await expect(page.getByRole("link", { name: reference })).toHaveCount(0);
  await page.goto("/admin/enquiries?handled=HANDLED");
  await expect(page.getByRole("link", { name: reference })).toBeVisible();
});

test("finance is not offered the enquiries section", async ({
  page,
  isMobile,
}) => {
  await signIn(page, "finance", "/admin");
  await expect(page).toHaveURL("/admin");
  if (isMobile) {
    await page.getByRole("button", { name: "Open navigation" }).click();
  }
  const nav = page.getByRole("navigation", { name: "Admin navigation" });
  await expect(nav.getByRole("link", { name: "Operators" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Enquiries" })).toHaveCount(0);
});

test("an enquiry that does not exist says so", async ({ page }) => {
  await signIn(page, "ops", "/admin");
  await expect(page).toHaveURL("/admin");
  await page.goto("/admin/enquiries/00000000-0000-4000-8000-000000000000");
  await expect(page.getByText("Enquiry not found")).toBeVisible();
});
