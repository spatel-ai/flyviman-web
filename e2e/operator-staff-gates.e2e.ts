import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  API_URL,
  latestPasswordLink,
  PASSWORD,
  signIn,
  uniqueEmail,
} from "./support/api";
import { addDraftAircraft, approvedAircraft, csrf } from "./support/operators";
import { requestedTrip } from "./support/requests";
import { openNav } from "./support/nav";

/**
 * What operator staff may open (D-211): the administrator's pages say so,
 * and bookings are limited to the staff member's aircraft.
 */

/** Invites staff through the API (the administrator is signed in on `admin`), accepts the link and signs in. */
async function staffMember(
  browser: Browser,
  admin: Page,
  access: { aircraftIds: string[]; capabilities: string[] },
) {
  const email = uniqueEmail("staff");
  const invited = await admin.request.post(`${API_URL}operator/staff`, {
    headers: await csrf(admin),
    data: {
      email,
      allAircraft: access.aircraftIds.length === 0,
      ...access,
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
  await signIn(staff, { email, password: PASSWORD });
  await expect(staff).toHaveURL(/\/operator$/);
  return { context, staff };
}

test("staff without the right see Managed by your administrator on the administrator's pages", async ({
  page,
  browser,
}) => {
  test.slow();
  await approvedAircraft(page, browser);
  const { context, staff } = await staffMember(browser, page, {
    aircraftIds: [],
    capabilities: ["MANAGE_BOOKINGS"],
  });

  for (const path of [
    "/operator/aircraft/new",
    "/operator/availability",
    "/operator/team",
    "/operator/settlements",
    "/operator/pricing",
  ]) {
    await staff.goto(path);
    await expect(
      staff.getByRole("heading", { name: "Managed by your administrator" }),
      path,
    ).toBeVisible();
  }
  await context.close();
});

test("staff without the empty-legs right get the locked card, no form, and no page marked current", async ({
  page,
  browser,
  isMobile,
}) => {
  test.skip(isMobile, "The navigation is a sheet on phones");
  test.slow();
  await approvedAircraft(page, browser);
  const { context, staff } = await staffMember(browser, page, {
    aircraftIds: [],
    capabilities: ["MANAGE_BOOKINGS"],
  });

  for (const path of ["/operator/empty-legs", "/operator/empty-legs/new"]) {
    await staff.goto(path);
    const main = staff.getByRole("main");
    await expect(
      main.getByRole("heading", { name: "Managed by your administrator" }),
      path,
    ).toBeVisible();
    await expect(main.getByText(/Manage empty legs permission/)).toBeVisible();
    await expect(
      main.getByRole("link", { name: "Back to dashboard" }),
    ).toBeVisible();
    // No red error, no Retry, no form, and the dashboard is not marked.
    await expect(main.getByRole("alert")).toHaveCount(0);
    await expect(main.getByRole("button", { name: "Retry" })).toHaveCount(0);
    await expect(main.getByRole("form")).toHaveCount(0);
    await expect(
      staff
        .getByRole("navigation", { name: "Operator navigation" })
        .locator('[aria-current="page"]'),
    ).toHaveCount(0);
  }
  await context.close();
});

test("staff with MANAGE_BOOKINGS on one aircraft see Requests and Bookings, and only that aircraft's", async ({
  page,
  browser,
  isMobile,
}) => {
  test.slow();
  const trip = await requestedTrip(page, browser, { priced: true });
  const elsewhere = await addDraftAircraft(page);
  const capabilities = ["MANAGE_BOOKINGS"];
  const mine = await staffMember(browser, page, {
    aircraftIds: [trip.id],
    capabilities,
  });
  const other = await staffMember(browser, page, {
    aircraftIds: [elsewhere.id],
    capabilities,
  });

  if (isMobile) {
    await mine.staff.getByRole("button", { name: "Open navigation" }).click();
  }
  const nav = mine.staff.getByRole("navigation", {
    name: "Operator navigation",
  });
  await openNav(nav, "Requests and bookings");
  await expect(nav.getByRole("link", { name: "Requests" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Bookings" })).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Team", includeHidden: true }),
  ).toHaveCount(0);

  // The request is on the first staff member's aircraft, not the second's.
  await mine.staff.goto("/operator/requests");
  await expect(
    mine.staff.getByRole("main").getByRole("link", { name: trip.reference }),
  ).toBeVisible();
  await other.staff.goto("/operator/requests");
  await expect(
    other.staff.getByRole("heading", { level: 1, name: "Requests" }),
  ).toBeVisible();
  await expect(
    other.staff.getByRole("main").getByRole("link", { name: trip.reference }),
  ).toHaveCount(0);
  await other.staff.goto("/operator/bookings");
  await expect(
    other.staff.getByRole("heading", { level: 1, name: "Bookings" }),
  ).toBeVisible();
  await expect(
    other.staff.getByRole("main").getByRole("link", { name: trip.reference }),
  ).toHaveCount(0);
  await mine.context.close();
  await other.context.close();
});
