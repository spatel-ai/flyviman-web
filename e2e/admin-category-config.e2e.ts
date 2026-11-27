import { expect, test, type Page } from "@playwright/test";
import { API_URL, signIn } from "./support/api";
import { csrf } from "./support/operators";

/**
 * Category configuration (M10, D-205): the super admin changes a deposit
 * with a reason and restores it; air ambulance is never offered Instant;
 * operations and finance only read. Serial, and a different category per
 * project because desktop and mobile run at once.
 */
test.describe.configure({ mode: "serial" });

const CATEGORY: Record<string, { code: string; name: string }> = {
  desktop: { code: "HELICOPTER", name: "helicopter" },
  mobile: { code: "EMPTY_LEG", name: "empty legs" },
};

type Row = {
  id: string;
  category: string;
  depositPercent: number;
  updatedAt: string;
};

async function configOf(page: Page, code: string): Promise<Row> {
  const list = await page.request.get(`${API_URL}admin/category-config`);
  expect(list.status()).toBe(200);
  return ((await list.json()).data as Row[]).find((r) => r.category === code)!;
}

test("the super admin changes a deposit only with a reason, then restores it", async ({
  page,
}) => {
  const { code, name } = CATEGORY[test.info().project.name] ?? CATEGORY.desktop;
  await signIn(page, "superAdmin", "/admin/category-config");
  const main = page.getByRole("main");
  await expect(
    main.getByRole("heading", { level: 1, name: "Categories" }),
  ).toBeVisible();
  const before = await configOf(page, code);
  const next = before.depositPercent === 30 ? 35 : 30;

  try {
    await main.getByRole("button", { name: `Change ${name} in IN` }).click();
    const dialog = page.getByRole("dialog", { name: /^Change / });
    await dialog.getByLabel("Deposit under model C (%)").fill(String(next));
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(
      dialog.getByText("Give a reason of at least 3 characters."),
    ).toBeVisible();

    await dialog.getByLabel("Reason").fill("Test run: change the deposit");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(/configuration changed/).first()).toBeVisible();
    await expect(dialog).toHaveCount(0);
    expect((await configOf(page, code)).depositPercent).toBe(next);
  } finally {
    const now = await configOf(page, code);
    if (now.depositPercent !== before.depositPercent) {
      const restored = await page.request.patch(
        `${API_URL}admin/category-config/${now.id}`,
        {
          headers: await csrf(page),
          data: {
            expectedUpdatedAt: now.updatedAt,
            depositPercent: before.depositPercent,
            reason: "Test run: restore the deposit",
          },
        },
      );
      expect(restored.status()).toBe(200);
    }
  }
  expect((await configOf(page, code)).depositPercent).toBe(
    before.depositPercent,
  );
});

test("air ambulance cannot be set to Instant booking", async ({ page }) => {
  await signIn(page, "superAdmin", "/admin/category-config");
  const main = page.getByRole("main");
  await main
    .getByRole("button", { name: "Change air ambulance in IN" })
    .click();
  const dialog = page.getByRole("dialog", { name: /^Change air ambulance/ });
  await dialog.getByRole("combobox", { name: "Booking" }).click();
  await expect(page.getByRole("option", { name: "On request" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Instant" })).toHaveCount(0);
  await page.keyboard.press("Escape");
});

for (const account of ["ops", "finance"] as const) {
  test(`${account} reads the configuration but cannot change it`, async ({
    page,
  }) => {
    await signIn(page, account, "/admin/category-config");
    const main = page.getByRole("main");
    await expect(
      main.getByRole("heading", { level: 1, name: "Categories" }),
    ).toBeVisible();
    await expect(main.getByText("Helicopter")).toBeVisible();
    await expect(main.getByText("Read only").first()).toBeVisible();
    await expect(main.getByRole("button", { name: /^Change / })).toHaveCount(0);
  });
}

test("the deposit is shown only for categories paid by deposit", async ({
  page,
}) => {
  await signIn(page, "superAdmin", "/admin/category-config");
  const main = page.getByRole("main");
  const rows = main.locator("tbody tr");
  // The loaded rows, not the loading placeholders.
  await expect(main.getByText("Helicopter")).toBeVisible();
  for (const row of await rows.all()) {
    const cells = row.getByRole("cell");
    const payment = (await cells.nth(4).innerText()).trim();
    const deposit = (await cells.nth(5).innerText()).trim();
    if (payment.startsWith("C:")) expect(deposit).toMatch(/^\d+%$/);
    else expect(deposit, payment).toBe("Not used");
  }
});
