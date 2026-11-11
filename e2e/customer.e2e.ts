import { expect, test, type Page } from "@playwright/test";
import {
  expectNoSidewaysScroll,
  latestCode,
  latestPasswordLink,
  PASSWORD,
  uniqueEmail,
} from "./support/api";

/** Registers a new customer through the pages and lands on the home page. */
async function register(page: Page, email: string) {
  await page.goto("/register");
  await page.getByRole("textbox", { name: "First name" }).fill("Asha");
  await page.getByRole("textbox", { name: "Last name" }).fill("Rao");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(PASSWORD);
  await page
    .getByRole("checkbox", { name: /I accept the terms of use/ })
    .click();
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/verify\?id=/);
  await page
    .getByRole("textbox", { name: "Verification code" })
    .fill(await latestCode(page.request, email));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL("/");
}

test.describe("customer registration", () => {
  test("a customer registers with email, verifies the code and is signed in", async ({
    page,
  }) => {
    const email = uniqueEmail("customer");
    await register(page, email);
    await expect(
      page.getByRole("button", { name: "Account menu" }),
    ).toBeVisible();
    await expectNoSidewaysScroll(page);
  });

  test("the form says what is wrong before anything is sent", async ({
    page,
  }) => {
    await page.goto("/register");
    await page.getByRole("textbox", { name: "Email" }).fill("asha@example.com");
    await page.getByRole("textbox", { name: "Password" }).fill("short");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(
      page.getByText("Enter your first name.", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Use at least 12 characters.", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page
        .getByText("Accept the terms and the privacy policy to continue.", {
          exact: true,
        })
        .first(),
    ).toBeVisible();
    await expect(page).toHaveURL("/register");
  });

  test("registering by mobile number explains a number without a country code", async ({
    page,
  }) => {
    await page.goto("/register");
    await page.getByRole("tab", { name: "Mobile number" }).click();
    await page.getByRole("textbox", { name: "First name" }).fill("Asha");
    await page.getByRole("textbox", { name: "Last name" }).fill("Rao");
    await page
      .getByRole("textbox", { name: "Mobile number" })
      .fill("9876543210");
    await page
      .getByRole("checkbox", { name: /I accept the terms of use/ })
      .click();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(
      page
        .getByText(
          "Enter the number with its country code, for example +919876543210.",
          { exact: true },
        )
        .first(),
    ).toBeVisible();
    await expect(page).toHaveURL("/register");
  });

  test("a wrong code is refused, a new one can be sent, and the right one works", async ({
    page,
  }) => {
    const email = uniqueEmail("customer");
    await page.goto("/register");
    await page.getByRole("textbox", { name: "First name" }).fill("Asha");
    await page.getByRole("textbox", { name: "Last name" }).fill("Rao");
    await page.getByRole("textbox", { name: "Email" }).fill(email);
    await page.getByRole("textbox", { name: "Password" }).fill(PASSWORD);
    await page
      .getByRole("checkbox", { name: /I accept the terms of use/ })
      .click();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/verify\?id=/);

    const first = await latestCode(page.request, email);
    const code = page.getByRole("textbox", { name: "Verification code" });
    await code.fill(first === "000000" ? "000001" : "000000");
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(
      page
        .getByText("That code is not correct. Check it and try again.", {
          exact: true,
        })
        .first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "Send a new code" }).click();
    await expect(
      page.getByText("We have sent a new code.", { exact: true }).first(),
    ).toBeVisible();
    await code.fill(await latestCode(page.request, email));
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page).toHaveURL("/");
  });

  test("the terms are readable from the registration form", async ({
    page,
  }) => {
    await page.goto("/legal/terms");
    await expect(
      page.getByRole("heading", { level: 1, name: "Terms of use" }),
    ).toBeVisible();
    await page.goto("/legal/does-not-exist");
    await expect(
      page.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeVisible();
  });
});

test.describe("customer account", () => {
  test("a customer updates their profile", async ({ page }) => {
    await register(page, uniqueEmail("customer"));
    await page.goto("/account");
    await expect(
      page.getByRole("heading", { level: 1, name: "Profile" }),
    ).toBeVisible();

    await expect(page.getByRole("textbox", { name: "First name" })).toHaveValue(
      "Asha",
    );
    await page.getByRole("textbox", { name: "Last name" }).fill("Menon");
    await page.getByLabel("Date of birth").fill("1990-04-12");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(
      page.getByText("Profile saved", { exact: true }).first(),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByRole("textbox", { name: "Last name" })).toHaveValue(
      "Menon",
    );
    await expect(page.getByLabel("Date of birth")).toHaveValue("1990-04-12");
  });

  test("a customer saves, edits and removes a passenger, using the keyboard in the dialog", async ({
    page,
  }) => {
    await register(page, uniqueEmail("customer"));
    await page.goto("/account/passengers");
    await expect(
      page.getByText("No saved passengers yet", { exact: true }).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "Add a passenger" }).click();
    const dialog = page.getByRole("dialog", { name: "Add a passenger" });
    await dialog.getByRole("textbox", { name: "First name" }).fill("Kavya");
    await dialog.getByRole("textbox", { name: "Last name" }).fill("Rao");
    await dialog.getByRole("combobox", { name: "Identity document" }).click();
    await page.getByRole("option", { name: "Passport" }).click();
    await dialog
      .getByRole("textbox", { name: "Document number" })
      .fill("P1234567");
    // Enter in a field submits the form.
    await dialog
      .getByRole("textbox", { name: "Document number" })
      .press("Enter");

    await expect(
      page.getByText("Passenger saved", { exact: true }).first(),
    ).toBeVisible();
    const list = page.getByRole("list", { name: "Saved passengers" });
    await expect(
      list.getByRole("heading", { name: "Kavya Rao" }),
    ).toBeVisible();
    // The identity document number is not shown in full on the page.
    await expect(
      list.getByText("Passport ••••4567", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      list.getByText("P1234567", { exact: true }).first(),
    ).toHaveCount(0);
    await expectNoSidewaysScroll(page);

    await page.getByRole("button", { name: "Edit Kavya Rao" }).click();
    const edit = page.getByRole("dialog", { name: "Edit passenger" });
    await expect(
      edit.getByRole("textbox", { name: "Document number" }),
    ).toHaveValue("P1234567");
    await edit.getByRole("textbox", { name: "First name" }).fill("Kavita");
    await edit.getByRole("button", { name: "Save changes" }).click();
    await expect(
      list.getByRole("heading", { name: "Kavita Rao" }),
    ).toBeVisible();

    // Escape closes the confirmation without removing anything.
    await page.getByRole("button", { name: "Remove Kavita Rao" }).click();
    const confirm = page.getByRole("dialog", {
      name: "Remove this passenger?",
    });
    await expect(confirm.getByRole("button", { name: "Cancel" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(confirm).toHaveCount(0);
    await expect(
      list.getByRole("heading", { name: "Kavita Rao" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Remove Kavita Rao" }).click();
    await page.getByRole("button", { name: "Remove passenger" }).click();
    await expect(
      page.getByText("No saved passengers yet", { exact: true }).first(),
    ).toBeVisible();
  });

  test("saving still works after the session has been idle", async ({
    page,
    context,
  }) => {
    await register(page, uniqueEmail("customer"));
    await page.goto("/account");
    await expect(page.getByRole("textbox", { name: "First name" })).toHaveValue(
      "Asha",
    );

    // The access cookie expires while the page sits open. The next request
    // the page makes is refused once, the session is renewed, and the
    // request is repeated, without the customer noticing.
    await context.clearCookies({ name: "access_token" });
    await page.getByRole("textbox", { name: "Last name" }).fill("Iyer");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(
      page.getByText("Profile saved", { exact: true }).first(),
    ).toBeVisible();
  });

  test("a new customer has a welcome notification and can mark it read", async ({
    page,
  }) => {
    await register(page, uniqueEmail("customer"));
    await page.goto("/account/notifications");
    const list = page.getByRole("list", { name: "Notifications" });
    await expect(
      list.getByRole("heading", { name: /Welcome to Flyviman/ }),
    ).toBeVisible();
    await list.getByRole("button", { name: "Mark as read" }).click();
    await expect(
      list.getByRole("button", { name: "Mark as read" }),
    ).toHaveCount(0);
  });
});

test("a customer who forgot their password sets a new one from the emailed link", async ({
  page,
}) => {
  const email = uniqueEmail("customer");
  await register(page, email);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");

  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(page).toHaveURL("/forgot-password");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("button", { name: "Email me a link" }).click();
  await expect(page.getByText(/we have\s+emailed a link/)).toBeVisible();

  await page.goto(await latestPasswordLink(page.request, email));
  const newPassword = "a brand new passphrase";
  await page
    .getByRole("textbox", { name: "New password", exact: true })
    .fill(newPassword);
  await page
    .getByRole("textbox", { name: "Repeat the new password" })
    .fill("something different");
  await page.getByRole("button", { name: "Set password" }).click();
  await expect(
    page.getByText("The two passwords do not match.", { exact: true }).first(),
  ).toBeVisible();

  await page
    .getByRole("textbox", { name: "Repeat the new password" })
    .fill(newPassword);
  await page.getByRole("button", { name: "Set password" }).click();
  await expect(page.getByText(/Your password has been set\./)).toBeVisible();

  await page.getByRole("link", { name: "Sign in" }).click();
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(newPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
});
