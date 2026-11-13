import { expect, test, type Page } from "@playwright/test";

/**
 * The enquiry form on /contact, against the real API (POST /enquiries,
 * D-083). The API's own suite covers idempotent replays and the rate limit.
 */

function field(page: Page, label: string) {
  return page.getByLabel(label, { exact: true });
}

test("an enquiry is sent and its reference shown", async ({ page }) => {
  await page.goto("/contact");

  await field(page, "Name").fill("Test Visitor");
  await field(page, "Email").fill("visitor@example.test");
  await field(page, "Message").fill("Mumbai to Goa on Friday, four people.");
  const sent = page.waitForRequest(
    (request) =>
      request.url().endsWith("/enquiries") && request.method() === "POST",
  );
  await page.getByRole("button", { name: "Send enquiry" }).click();

  const request = await sent;
  expect(request.headers()["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/);
  expect(request.postDataJSON()).toEqual({
    name: "Test Visitor",
    email: "visitor@example.test",
    topic: "GENERAL",
    message: "Mumbai to Goa on Friday, four people.",
  });
  const status = page.getByRole("status");
  const confirmation = status.getByRole("heading", {
    name: "We have received your enquiry",
  });
  await expect(confirmation).toBeVisible();
  // Focus moves to the confirmation, so it is read out.
  await expect(confirmation).toBeFocused();
  await expect(status).toContainText(/FLY-ENQ-[A-Z0-9]{6}/);
  // Never the words of a booking.
  await expect(status).not.toContainText(/booked|confirmed/i);
});

test("missing details are explained under their fields", async ({ page }) => {
  await page.goto("/contact");

  await page.getByRole("button", { name: "Send enquiry" }).click();

  await expect(page.getByText("Enter your name.")).toBeVisible();
  await expect(
    page.getByText("Give an email address or a phone number so we can reply."),
  ).toBeVisible();
  await expect(
    page.getByText("Tell us a little more: at least 10 characters."),
  ).toBeVisible();
});

test("a phone number alone is enough", async ({ page }) => {
  await page.goto("/contact");

  await field(page, "Name").fill("Phone Only");
  await field(page, "Phone (optional)").fill("+91 98765 43210");
  await field(page, "Message").fill("Please call me about a group charter.");
  await page.getByRole("button", { name: "Send enquiry" }).click();

  await expect(
    page.getByRole("heading", { name: "We have received your enquiry" }),
  ).toBeVisible();
});

test("an enquiry from a charter card arrives with its topic chosen", async ({
  page,
}) => {
  await page.goto("/charter");
  await page
    .getByRole("link", { name: "Send an enquiry: pilgrimage charter" })
    .click();

  await expect(page).toHaveURL(/topic=PILGRIMAGE_CHARTER/);
  await expect(
    page.getByRole("combobox", { name: "What is it about?" }),
  ).toHaveText(/Pilgrimage charter/);
});

test("choosing a medical charter asks for no medical details and points to emergency services", async ({
  page,
}) => {
  await page.goto("/contact?topic=MEDICAL_CHARTER");

  await expect(
    page.getByText(/Please do not include medical details here/),
  ).toBeVisible();
  await expect(page.getByText(/In an emergency, call 112/)).toBeVisible();

  await page.goto("/contact");
  await expect(
    page.getByText(/Please do not include medical details here/),
  ).toHaveCount(0);
});
