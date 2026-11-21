import { expect, test, type Page } from "@playwright/test";
import {
  API_URL,
  PASSWORD,
  latestCode,
  signIn,
  uniqueEmail,
} from "./support/api";
import { listedJet, requestThroughApi, searchFor } from "./support/bookings";
import { csrf } from "./support/operators";

/** "Delete my account" (D-199): customers the test registers itself. */

async function registered(page: Page) {
  const email = uniqueEmail("customer");
  const register = await page.request.post(`${API_URL}auth/register`, {
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
  const verified = await page.request.post(`${API_URL}auth/email/verify`, {
    data: { verificationId, code: await latestCode(page.request, email) },
  });
  expect(verified.status()).toBe(200);
  return email;
}

async function deleteWithPassword(page: Page) {
  await page.goto("/account/profile");
  await page.getByLabel("Your password").fill(PASSWORD);
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.getByRole("button", { name: "Delete permanently" }).click();
}

test("a customer with an open request is refused and told why", async ({
  browser,
}) => {
  test.slow();
  const { operator, aircraftId } = await listedJet(browser, true);
  const context = await browser.newContext();
  const page = await context.newPage();
  await registered(page);
  const saved = await page.request.post(`${API_URL}me/passengers`, {
    headers: await csrf(page),
    data: {
      firstName: "Kavya",
      lastName: "Ramaswamy",
      dateOfBirth: "1990-04-12",
      gender: "FEMALE",
      nationality: "IN",
    },
  });
  await requestThroughApi(
    page,
    await searchFor(page, aircraftId),
    (await saved.json()).data.id,
  );

  await deleteWithPassword(page);
  const refusal = page.getByRole("alert").filter({
    hasText: "Your account cannot be deleted yet.",
  });
  await expect(refusal).toContainText(/still open/);
  // Still signed in.
  await expect(
    page.getByRole("button", { name: "Account menu" }),
  ).toBeVisible();
  await operator.close();
});

test("a customer with nothing open deletes the account and cannot sign in again", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const email = await registered(page);

  await deleteWithPassword(page);
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("link", { name: "Sign in" }).first(),
  ).toBeVisible();

  await signIn(page, { email, password: PASSWORD });
  await expect(
    page.getByText("The email or password is not correct."),
  ).toBeVisible();
  await context.close();
});
