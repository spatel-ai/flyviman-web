import { expect, test } from "@playwright/test";
import { API_URL, PASSWORD, latestCode, uniqueEmail } from "./support/api";
import { approvedAircraft, asStaff, csrf } from "./support/operators";

/** Requesting a published empty leg, adding the passenger on the page (D-210, D-213). */

test("a customer with no saved passengers adds one on the request page and sends the request", async ({
  page,
  browser,
}) => {
  test.slow();
  // An approved, published offer made through the API as an operator.
  const { id: aircraftId } = await approvedAircraft(page, browser);
  const headers = await csrf(page);
  const place = async (code: string) =>
    (
      await (
        await page.request.get(`${API_URL}locations`, {
          params: { q: code, pageSize: 1 },
        })
      ).json()
    ).data[0].id as string;
  const day = (days: number, hour: number) =>
    new Date(Date.now() + days * 86_400_000 + hour * 3_600_000).toISOString();
  const created = await page.request.post(`${API_URL}operator/empty-legs`, {
    headers,
    data: {
      aircraftId,
      originId: await place("GOI"),
      destinationId: await place("BOM"),
      departureFrom: day(6, 4),
      departureTo: day(6, 12),
      seatsAvailable: 6,
      priceMinor: 18_500_000,
      validUntil: day(5, 12),
      conditions: "Subject to the aircraft repositioning as planned.",
    },
  });
  expect(created.status()).toBe(201);
  const offerId = (await created.json()).data.id as string;
  expect(
    (
      await page.request.post(
        `${API_URL}operator/empty-legs/${offerId}/publish`,
        {
          headers,
        },
      )
    ).status(),
  ).toBe(200);
  const staff = await asStaff(browser);
  expect(
    (
      await staff.page.request.post(
        `${API_URL}admin/empty-legs/${offerId}/approve`,
        {
          headers: await csrf(staff.page),
        },
      )
    ).status(),
  ).toBe(200);
  await staff.context.close();

  // A customer with no saved passengers.
  const context = await browser.newContext();
  const customer = await context.newPage();
  const email = uniqueEmail("customer");
  const register = await customer.request.post(`${API_URL}auth/register`, {
    data: {
      firstName: "Asha",
      lastName: "Rao",
      email,
      password: PASSWORD,
      acceptTerms: true,
    },
  });
  expect(register.status()).toBe(202);
  const { verificationId } = (await register.json()).data;
  expect(
    (
      await customer.request.post(`${API_URL}auth/email/verify`, {
        data: {
          verificationId,
          code: await latestCode(customer.request, email),
        },
      })
    ).status(),
  ).toBe(200);

  const offerLink = customer.locator(`a[href="/empty-legs/${offerId}"]`);
  await customer.goto(`/book/empty-leg/${offerId}`);
  const main = customer.getByRole("main");
  await expect(
    main.getByRole("heading", { name: "Request this empty leg" }),
  ).toBeVisible();

  // Add the passenger inline: the request is not sent by the dialog.
  await main.getByRole("button", { name: "Add a passenger" }).click();
  const dialog = customer.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "First name" }).fill("Aditi");
  await dialog.getByRole("textbox", { name: "Last name" }).fill("Nair");
  await dialog.getByLabel("Date of birth").fill("1991-05-05");
  await dialog.getByRole("button", { name: "Save passenger" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(customer).toHaveURL(/\/book\/empty-leg\//);
  await expect(
    main.getByRole("checkbox", { name: "Aditi Nair" }),
  ).toBeChecked();

  // The cancellation terms come before the button (rule 9).
  const terms = main.getByRole("heading", { name: "Cancellation conditions" });
  const send = main.getByRole("button", { name: "Send request" });
  await expect(terms).toBeVisible();
  const [termsBox, sendBox] = [
    await terms.boundingBox(),
    await send.boundingBox(),
  ];
  expect(termsBox!.y).toBeLessThan(sendBox!.y);

  await send.click();
  await expect(customer).toHaveURL(
    /\/account\/trips\/FLY-BK-[A-Z0-9]+\?sent=1$/,
  );
  await expect(
    main.getByText("Awaiting operator", { exact: true }),
  ).toBeVisible();

  // The requested offer left the public list.
  await customer.goto("/empty-legs");
  await expect(
    customer.getByRole("heading", { level: 1, name: "Empty legs" }),
  ).toBeVisible();
  await expect(offerLink).toHaveCount(0);
  await context.close();
});
