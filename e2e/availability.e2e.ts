import { expect, test, type Page } from "@playwright/test";
import { expectNoSidewaysScroll } from "./support/api";
import { approvedAircraft } from "./support/operators";

/** A calendar day in India, `days` from today. */
function istDay(days: number): string {
  const ist = new Date(Date.now() + 5.5 * 3_600_000 + days * 86_400_000);
  return ist.toISOString().slice(0, 10);
}

/** The Tuesday and Wednesday of next week (India), so both are on screen. */
function nextWeekDays(): { day: string; next: string } {
  const inAWeek = new Date(`${istDay(7)}T00:00:00Z`);
  const monday = new Date(
    inAWeek.getTime() - ((inAWeek.getUTCDay() + 6) % 7) * 86_400_000,
  );
  const at = (offset: number) =>
    new Date(monday.getTime() + offset * 86_400_000).toISOString().slice(0, 10);
  return { day: at(1), next: at(2) };
}

/** How the calendar names a day: "Mon, 16 Nov". */
function dayLabel(day: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}

async function addEntry(
  page: Page,
  registration: string,
  day: string,
  entry: { type?: string; start: string; end: string },
) {
  await page
    .getByRole("button", {
      name: `Add to ${registration} on ${dayLabel(day)}`,
    })
    .click();
  const dialog = page.getByRole("dialog", { name: `Add to ${registration}` });
  if (entry.type) {
    await dialog.getByRole("combobox", { name: "Type" }).click();
    await page.getByRole("option", { name: entry.type, exact: true }).click();
  }
  await dialog.getByLabel("Start time (IST)").fill(entry.start);
  await dialog.getByLabel("End time (IST)").fill(entry.end);
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

test("an operator offers time, holds it twice, resolves the overlap and opens the aircraft calendar", async ({
  page,
  browser,
}) => {
  test.slow();
  const { registration } = await approvedAircraft(page, browser);
  const { day, next } = nextWeekDays();

  await page.goto(`/operator/availability?view=week&date=${day}`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Availability" }),
  ).toBeVisible();
  await expect(page.getByText("Times in IST (Asia/Kolkata)")).toBeVisible();
  await expect(
    page
      .getByRole("group", { name: registration })
      .getByRole("link", { name: registration }),
  ).toBeVisible();

  // An open slot from a day cell.
  await addEntry(page, registration, day, { start: "09:00", end: "17:00" });
  const open = page.getByRole("button", {
    name: new RegExp(`^${registration}: Open, .*09:00–17:00 IST`),
  });
  await expect(open).toBeVisible();

  // Two soft holds on the same morning are listed as overlapping.
  await addEntry(page, registration, next, {
    type: "Soft hold",
    start: "10:00",
    end: "14:00",
  });
  await addEntry(page, registration, next, {
    type: "Soft hold",
    start: "12:00",
    end: "18:00",
  });
  const conflicts = page.getByRole("region", {
    name: "Overlapping soft holds (1)",
  });
  await expect(conflicts).toBeVisible();
  await expect(conflicts.getByText(registration)).toBeVisible();

  // Remove one; the overlap is gone.
  await page
    .getByRole("button", {
      name: new RegExp(`^${registration}: Soft hold, .*12:00–18:00 IST`),
    })
    .click();
  const sheet = page.getByRole("dialog", {
    name: `Soft hold · ${registration}`,
  });
  await sheet.getByRole("button", { name: "Remove" }).click();
  await page
    .getByRole("dialog", { name: "Remove this soft hold?" })
    .getByRole("button", { name: "Remove" })
    .click();
  await expect(conflicts).toHaveCount(0);
  await expectNoSidewaysScroll(page);

  // The month shows the same slot.
  await page.getByRole("tab", { name: "Month" }).click();
  await expect(page).toHaveURL(/view=month/);
  await expect(open).toBeVisible();

  // The aircraft's own calendar, in its home base's time.
  await page
    .getByRole("group", { name: registration })
    .getByRole("link", { name: registration })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: registration }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Week" }).click();
  const dayColumn = page.getByRole("listitem", { name: dayLabel(day) });
  await expect(dayColumn.getByText("09:00–17:00 IST")).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("the calendar does not let an operator create a booking", async ({
  page,
  browser,
}) => {
  test.slow();
  const { registration } = await approvedAircraft(page, browser);
  const day = istDay(5);
  await page.goto(`/operator/availability?view=week&date=${day}`);
  await page
    .getByRole("button", { name: `Add to ${registration} on ${dayLabel(day)}` })
    .click();
  await page.getByRole("combobox", { name: "Type" }).click();
  await expect(page.getByRole("option", { name: "Open" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Booking" })).toHaveCount(0);
});

/** A real 1×1 PNG, so the thumbnail must actually load and decode. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

test("an operator adds and removes a photo and grounds an aircraft", async ({
  page,
  browser,
}) => {
  test.slow();
  const { id, registration } = await approvedAircraft(page, browser);
  await page.goto(`/operator/aircraft/${id}`);
  await expect(
    page.getByRole("heading", { level: 1, name: registration }),
  ).toBeVisible();

  // A photo is shown, then removed; the aircraft stays approved.
  await page.getByLabel("Image").setInputFiles({
    name: "cabin.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await page.getByRole("button", { name: "Add image" }).click();
  const thumbnail = page.getByRole("img", { name: "Photo: cabin.png" });
  await expect(thumbnail).toBeVisible();
  await expect
    .poll(() =>
      thumbnail.evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Remove cabin.png" }).click();
  await page
    .getByRole("dialog", { name: "Remove this image?" })
    .getByRole("button", { name: "Remove" })
    .click();
  await expect(thumbnail).toHaveCount(0);
  await expect(page.locator("h1 + [data-status]")).toHaveAttribute(
    "data-status",
    "APPROVED",
  );

  // Grounded for maintenance, and the fleet shows it.
  await page.getByRole("combobox", { name: "Availability" }).click();
  await page.getByRole("option", { name: "Maintenance", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Mark as maintenance?" })
    .getByRole("button", { name: "Change" })
    .click();
  await expect(
    page.locator('[data-status="MAINTENANCE"]').first(),
  ).toBeVisible();
  await page.goto("/operator/aircraft");
  await expect(
    page
      .getByRole("listitem")
      .filter({ hasText: registration })
      .locator('[data-status="MAINTENANCE"]'),
  ).toBeVisible();

  // A verified document on a live listing is replaced, not removed.
  await page.goto(`/operator/aircraft/${id}`);
  await expect(
    page.getByRole("heading", { level: 1, name: registration }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Remove Insurance/ }),
  ).toHaveCount(0);
  await expectNoSidewaysScroll(page);
});

test("editing an approved aircraft's details warns, then sends it back to review", async ({
  page,
  browser,
}) => {
  test.slow();
  const { id, registration } = await approvedAircraft(page, browser);
  await page.goto(`/operator/aircraft/${id}`);
  await page.getByRole("button", { name: "Edit details" }).click();
  const dialog = page.getByRole("dialog", { name: `Edit ${registration}` });
  await expect(
    dialog.getByText(/sends the aircraft back to review/),
  ).toBeVisible();

  // An unchanged save just closes.
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("h1 + [data-status]")).toHaveAttribute(
    "data-status",
    "APPROVED",
  );

  await page.getByRole("button", { name: "Edit details" }).click();
  await dialog.getByLabel("Passenger capacity").fill("6");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await page
    .getByRole("dialog", { name: "Send the aircraft back to review?" })
    .getByRole("button", { name: "Save and send for review" })
    .click();
  await expect(page.locator("h1 + [data-status]")).toHaveAttribute(
    "data-status",
    "PENDING_REVIEW",
  );
  await expect(page.getByText(/6 passengers/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit details" })).toHaveCount(
    0,
  );
});
