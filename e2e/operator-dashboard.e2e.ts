import { expect, test } from "@playwright/test";
import {
  API_URL,
  latestPasswordLink,
  PASSWORD,
  signIn,
  uniqueEmail,
} from "./support/api";
import { approvedOperator, csrf } from "./support/operators";

/** The operator dashboard's tiles: the administrator's link to their pages; staff have no Settlements. */

const TILES: [string, string][] = [
  ["Requests awaiting your response", "/operator/requests"],
  ["Quotes sent", "/operator/requests"],
  ["Trips in the next 14 days", "/operator/requests"],
  ["Approved aircraft", "/operator/aircraft"],
  ["Aircraft documents", "/operator/aircraft"],
  ["Live empty legs", "/operator/empty-legs"],
  ["Settlements due", "/operator/settlements"],
];

test("the administrator's dashboard shows every tile, each linking to its page", async ({
  page,
  browser,
}) => {
  test.slow();
  await approvedOperator(page, browser);
  await page.goto("/operator");
  const main = page.getByRole("main");
  for (const [label, href] of TILES) {
    await expect(
      main.getByRole("link", { name: new RegExp(label) }).first(),
    ).toHaveAttribute("href", href);
  }
  await main.getByRole("link", { name: /Settlements due/ }).click();
  await expect(page).toHaveURL(/\/operator\/settlements$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Settlements" }),
  ).toBeVisible();
});

test("staff see no Settlements tile", async ({ page, browser }) => {
  test.slow();
  await approvedOperator(page, browser);
  const email = uniqueEmail("staff");
  const invited = await page.request.post(`${API_URL}operator/staff`, {
    headers: await csrf(page),
    data: {
      email,
      allAircraft: true,
      aircraftIds: [],
      capabilities: ["MANAGE_BOOKINGS"],
    },
  });
  expect(invited.status()).toBe(201);

  const context = await browser.newContext();
  const staff = await context.newPage();
  await staff.goto(await latestPasswordLink(staff.request, email));
  await staff
    .getByRole("textbox", { name: "New password", exact: true })
    .fill(PASSWORD);
  await staff
    .getByRole("textbox", { name: "Repeat the new password" })
    .fill(PASSWORD);
  await staff.getByRole("button", { name: "Set password" }).click();
  // Sign in only once the password is saved, or the sign-in can race it.
  await expect(staff.getByText(/Your password has been set\./)).toBeVisible();
  await signIn(staff, { email, password: PASSWORD });
  await expect(staff).toHaveURL(/\/operator$/);

  const main = staff.getByRole("main");
  await expect(
    main.getByRole("link", { name: /Requests awaiting your response/ }),
  ).toBeVisible();
  await expect(main.getByRole("link", { name: /Settlements due/ })).toHaveCount(
    0,
  );
  await context.close();
});
