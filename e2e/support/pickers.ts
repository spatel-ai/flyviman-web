import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Drive the date and time fields (`Input type="date"` / `type="time"`,
 * `components/ui/date-field.tsx`, `time-field.tsx`) the way a person does:
 * open the field's picker, choose, close. The same steps work on the
 * desktop popover and the phone sheet; both are a dialog named by the
 * field's label. While it is open the page behind is hidden from role
 * queries, so these helpers find the picker from the page, not the scope.
 */

type Scope = Page | Locator;

const pageOf = (scope: Scope): Page =>
  "page" in scope && typeof scope.page === "function"
    ? scope.page()
    : (scope as Page);

/** The field's button: its accessible name is exactly the label. */
export function pickerField(scope: Scope, label: string): Locator {
  return scope.getByRole("button", { name: label, exact: true });
}

/** Opens the field's picker, retrying a click made before hydration. */
async function open(scope: Scope, label: string): Promise<Locator> {
  const picker = pageOf(scope).getByRole("dialog", {
    name: label,
    exact: true,
  });
  const field = pickerField(scope, label);
  await expect(async () => {
    if (!(await picker.isVisible())) await field.click();
    await expect(picker).toBeVisible({ timeout: 1000 });
  }).toPass();
  return picker;
}

const utc = (day: string) => new Date(`${day}T00:00:00Z`);

/** As the calendar names its days: "Mon, 16 Nov 2026". */
function dayName(day: string): string {
  const text = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(utc(day));
  return `${text} ${day.slice(0, 4)}`;
}

/** As the field shows a day: "16 Nov 2026". */
function shownDay(day: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(utc(day));
}

/**
 * Chooses `day` (`YYYY-MM-DD`) in the field labelled `label`, through the
 * month-and-year chooser, so any year is two clicks away. `""` clears it.
 */
export async function setDate(scope: Scope, label: string, day: string) {
  const picker = await open(scope, label);
  if (day === "") {
    await picker.getByRole("button", { name: "Clear", exact: true }).click();
  } else {
    await picker
      .getByRole("button", { name: /choose month and year$/ })
      .click();
    await picker
      .getByRole("group", { name: "Year" })
      .getByRole("button", { name: day.slice(0, 4), exact: true })
      .click();
    const month = new Intl.DateTimeFormat("en-IN", {
      month: "long",
      timeZone: "UTC",
    }).format(utc(day));
    await picker
      .getByRole("group", { name: "Month" })
      .getByRole("button", { name: month, exact: true })
      .click();
    await picker
      .getByRole("button", { name: dayName(day), exact: true })
      .click();
  }
  await expect(picker).toBeHidden();
  await expectDate(scope, label, day);
}

/**
 * Chooses `time` (`HH:mm`, minutes in five-minute steps) in the field
 * labelled `label`, then Done. `""` clears it.
 */
export async function setTime(scope: Scope, label: string, time: string) {
  const picker = await open(scope, label);
  if (time === "") {
    await picker.getByRole("button", { name: "Clear", exact: true }).click();
  } else {
    const [hour, minute] = time.split(":");
    await picker
      .getByRole("listbox", { name: "Hours" })
      .getByRole("option", { name: hour, exact: true })
      .click();
    await picker
      .getByRole("listbox", { name: "Minutes" })
      .getByRole("option", { name: minute, exact: true })
      .click();
    await picker.getByRole("button", { name: "Done", exact: true }).click();
  }
  await expect(picker).toBeHidden();
  await expectTime(scope, label, time);
}

/** The field shows `day` (`YYYY-MM-DD`), or "Choose date" for `""`. */
export async function expectDate(scope: Scope, label: string, day: string) {
  await expect(pickerField(scope, label)).toHaveText(
    day === "" ? "Choose date" : shownDay(day),
  );
}

/** The field shows `time` (`HH:mm`), or "Choose time" for `""`. */
export async function expectTime(scope: Scope, label: string, time: string) {
  await expect(pickerField(scope, label)).toHaveText(
    time === "" ? "Choose time" : time,
  );
}
