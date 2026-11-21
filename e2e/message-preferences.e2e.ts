import { expect, test } from "@playwright/test";
import { newCustomer } from "./support/bookings";

test("switching SMS off persists after a reload and can be switched back", async ({
  browser,
}) => {
  const { page } = await newCustomer(browser);
  await page.goto("/account/notifications");
  const sms = page.getByRole("checkbox", { name: "Text messages (SMS)" });
  await expect(sms).toBeChecked();

  await sms.click();
  await expect(
    page.getByText("Message preferences saved").first(),
  ).toBeVisible();
  await page.reload();
  await expect(sms).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: "WhatsApp" })).toBeChecked();

  await sms.click();
  await expect(sms).toBeChecked();
  await page.reload();
  await expect(sms).toBeChecked();
});
