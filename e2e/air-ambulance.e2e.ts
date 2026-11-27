import { expect, test, type Page } from "@playwright/test";
import { expectNoSidewaysScroll, signIn } from "./support/api";
import { axeViolations } from "./support/axe";
import { approvedAircraft, asStaff, PDF } from "./support/operators";

/**
 * Air ambulance (M11, W4-6): the request page with its emergency notice,
 * the customer's request and quote, operations' coordination and the
 * selected operator's view. A request is never confirmed except by
 * operations, with every feasibility check saved (rule 7).
 */

const CONDITION = "Post-operative cardiac patient, stable on monitoring";
const PICKUP = "City Hospital, Ward 4";

/** Chooses a location in a LocationField by searching its code. */
async function chooseLocation(
  page: Page,
  searchLabel: string,
  label: string,
  code: string,
) {
  await page.getByRole("textbox", { name: searchLabel }).fill(code);
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page
    .getByRole("option", { name: new RegExp(`\\b${code}\\)`) })
    .first()
    .click();
}

test("the request page shows the emergency notice first, never animated, and asks visitors to sign in", async ({
  page,
}) => {
  await page.goto("/air-ambulance");
  const notice = page.getByRole("complementary", { name: "Emergency" });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("call 112");
  // Nothing moves it: no animation on the notice or its parents.
  const animated = await notice.evaluate((element) => {
    for (let node: Element | null = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.animationName !== "none") return true;
    }
    return false;
  });
  expect(animated).toBe(false);
  // It comes before the heading.
  const order = await page.evaluate(() => {
    const notice = document.querySelector("[data-emergency-notice]");
    const heading = document.querySelector("main h1");
    return notice && heading
      ? notice.compareDocumentPosition(heading) &
          Node.DOCUMENT_POSITION_FOLLOWING
      : 0;
  });
  expect(order).toBeGreaterThan(0);
  await expect(
    page.getByRole("link", { name: "Sign in to request" }),
  ).toHaveAttribute("href", "/login?next=%2Fair-ambulance");
  await expect(
    page.getByRole("form", { name: "Air ambulance request" }),
  ).toHaveCount(0);
});

test("a request goes from the customer through operations to the operator, confirmed only by operations", async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000);

  // An approved operator with an approved air ambulance aircraft.
  const operatorContext = await browser.newContext();
  const operator = await operatorContext.newPage();
  const { legalName } = await approvedAircraft(
    operator,
    browser,
    undefined,
    "AIR_AMBULANCE_FIXED",
  );

  // The customer sends a request with a document.
  await signIn(page, "customer", "/air-ambulance");
  await expect(page).toHaveURL("/air-ambulance");
  await expect(
    page.getByRole("complementary", { name: "Emergency" }),
  ).toBeVisible();
  const form = page.getByRole("form", { name: "Air ambulance request" });
  await form.getByRole("textbox", { name: "Your name" }).fill("Asha Rao");
  await form
    .getByRole("textbox", { name: "Phone", exact: true })
    .fill("+919800000001");
  await chooseLocation(
    page,
    "Find the airport or helipad nearest the patient",
    "From",
    "BOM",
  );
  await chooseLocation(
    page,
    "Find the airport or helipad nearest the receiving facility",
    "To",
    "DEL",
  );
  await form
    .getByRole("textbox", { name: "Collection address (optional)" })
    .fill(PICKUP);
  await form.getByLabel("Preferred date").fill("2030-01-15");
  await form.getByLabel("Preferred time (India time)").fill("09:30");
  await form
    .getByRole("textbox", { name: "Patient's condition" })
    .fill(CONDITION);
  await form.getByRole("combobox", { name: "Mobility" }).click();
  await page
    .getByRole("option", { name: "Cannot walk (bed or stretcher)" })
    .click();
  await form.getByRole("checkbox", { name: "Stretcher needed" }).click();
  await form.getByLabel("Add documents").setInputFiles({
    name: "discharge-summary.pdf",
    mimeType: "application/pdf",
    buffer: PDF,
  });
  await expect(
    form.getByRole("list", { name: "Chosen documents" }),
  ).toContainText("discharge-summary.pdf");
  // Long airport names never widen the page on a phone.
  await expectNoSidewaysScroll(page);
  await form.getByRole("button", { name: "Send request" }).click();

  await expect(page).toHaveURL(
    /\/account\/air-ambulance\/FLY-AA-[A-Z0-9]{6}\?sent=1$/,
  );
  const reference = /FLY-AA-[A-Z0-9]{6}/.exec(page.url())![0];
  // No medical data in the address.
  expect(page.url()).not.toMatch(/cardiac|Hospital|Asha/i);
  const main = page.getByRole("main");
  await expect(main.getByText("Request received").first()).toBeVisible();
  await expect(
    main.getByRole("list", { name: "Medical documents" }),
  ).toContainText("discharge-summary.pdf");
  await expect(main.getByText(CONDITION)).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Emergency" }),
  ).toBeVisible();
  await page.goto("/account/air-ambulance");
  await expect(
    page.getByRole("link", { name: new RegExp(reference) }),
  ).toBeVisible();

  // Operations take it, check feasibility and send a quote.
  const ops = await asStaff(browser, "ops");
  await ops.page.goto(`/admin/air-ambulance/${reference}`);
  const opsMain = ops.page.getByRole("main");
  await expect(opsMain.getByText(/Shown only to the request/)).toBeVisible();
  await opsMain.getByRole("button", { name: "Take request" }).click();
  await expect(opsMain.getByText(CONDITION)).toBeVisible();
  // The details are valid description lists (W1-029, W2-035).
  expect(await axeViolations(ops.page, ["definition-list", "dlitem"])).toEqual(
    [],
  );
  await opsMain.getByRole("button", { name: "Start sourcing" }).click();
  await opsMain
    .getByRole("button", { name: "Start feasibility check" })
    .click();
  const checklist = opsMain.getByRole("form", {
    name: "Feasibility checklist",
  });
  // `all()` does not wait: let the checklist appear first.
  await expect(checklist.getByRole("checkbox")).toHaveCount(9);
  for (const box of await checklist.getByRole("checkbox").all()) {
    await box.click();
  }
  await checklist.getByRole("button", { name: "Save checklist" }).click();
  await expect(
    checklist.getByText("9 of 9 checked, saved complete."),
  ).toBeVisible();

  const quote = opsMain.getByRole("form", { name: "Quote" });
  await quote.getByRole("combobox", { name: "Operator" }).click();
  await ops.page.getByRole("option", { name: legalName }).click();
  await quote.getByRole("textbox", { name: "Amount (₹)" }).fill("450000");
  await quote
    .getByRole("textbox", { name: "Conditions" })
    .fill("Free cancellation until the aircraft is dispatched.");
  await quote.getByRole("button", { name: "Send quote" }).click();
  await expect(opsMain.getByText("Quote ready").first()).toBeVisible();
  // Not confirmable before the customer accepts.
  await expect(
    opsMain.getByRole("button", { name: "Confirm mission" }),
  ).toHaveCount(0);

  // The customer sees the labelled quote and its conditions, and accepts.
  await page.goto(`/account/air-ambulance/${reference}`);
  const quoteSection = main.getByRole("region", { name: "Quote" });
  // Labelled as a quote (rule 1), never a confirmed price.
  await expect(quoteSection.getByText("Quoted by the operator")).toBeVisible();
  await expect(quoteSection.getByText("Confirmed price")).toHaveCount(0);
  await expect(quoteSection).toContainText("4,50,000");
  await expect(quoteSection).toContainText(
    "Free cancellation until the aircraft is dispatched.",
  );
  await quoteSection.getByRole("button", { name: "Accept quote" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Accept quote" })
    .click();
  await expect(
    main.getByText("Quote accepted, request pending").first(),
  ).toBeVisible();
  await expect(main.getByText("Confirmed", { exact: true })).toHaveCount(0);
  expect(await axeViolations(page, ["definition-list", "dlitem"])).toEqual([]);

  // Operations confirm, with the checklist complete.
  await ops.page.reload();
  await opsMain.getByRole("button", { name: "Confirm mission" }).click();
  await ops.page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm mission" })
    .click();
  await expect(
    opsMain.getByText("Confirmed", { exact: true }).first(),
  ).toBeVisible();
  await ops.context.close();

  // The operator's administrator sees the mission and its medical details.
  await operator.goto("/operator/air-ambulance");
  const operatorMain = operator.getByRole("main");
  await operatorMain.getByRole("link", { name: reference }).click();
  await expect(operator).toHaveURL(`/operator/air-ambulance/${reference}`);
  await expect(operatorMain.getByText(CONDITION)).toBeVisible();
  await expect(operatorMain.getByText(PICKUP)).toBeVisible();
  expect(await axeViolations(operator, ["definition-list", "dlitem"])).toEqual(
    [],
  );
  await expect(
    operatorMain.getByRole("list", { name: "Medical documents" }),
  ).toContainText("discharge-summary.pdf");
  // No customer contacts on the operator's view.
  await expect(operatorMain.getByText("Asha Rao")).toHaveCount(0);
  await operatorContext.close();
});
