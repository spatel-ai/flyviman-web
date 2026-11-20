import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./support/api";
import {
  askQuestion,
  listedJet,
  newCustomer,
  requestThroughApi,
  searchFor,
  sendQuote,
} from "./support/bookings";

/** Customer booking requests and trips (M8, W3-6). */

test("a customer requests a priced flight from a result, finds it in trips and cancels after seeing the cost", async ({
  browser,
}) => {
  test.slow();
  const { operator, aircraftId } = await listedJet(browser, true);
  const { page } = await newCustomer(browser);
  const searched = await searchFor(page, aircraftId);

  await page.goto(`/search/${searched.searchId}/${searched.resultId}`);
  await page
    .getByRole("link", { name: "Request this flight" })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/book\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/);

  const main = page.getByRole("main");
  // The labelled price and the cancellation conditions come before the button (rules 1, 9).
  // The result page stays in the document, hidden: count visible text only.
  await expect(
    main
      .getByText("Estimate", { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(
    main
      .getByText(/Cancellation conditions/)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expectNoSidewaysScroll(page);

  // The lead passenger is required.
  const send = page.getByRole("button", { name: "Send request" });
  await expect(send).toBeEnabled();
  await send.click();
  await expect(
    page.getByText("Choose at least the lead passenger."),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Kavya Ramaswamy" }).click();
  await page
    .getByRole("textbox", { name: /Special requests/ })
    .fill("Two bags and a stroller");
  await send.click();

  await expect(page).toHaveURL(/\/account\/trips\/FLY-BK-[A-Z0-9]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "FLY-BK-",
  );
  // Booking and payment status are two badges.
  await expect(
    main.getByText("Awaiting operator", { exact: true }),
  ).toBeVisible();
  await expect(main.getByText("Unpaid", { exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Passengers" })
      .getByText("Kavya Ramaswamy"),
  ).toBeVisible();
  await expect(
    main.getByText("Special requests: Two bags and a stroller"),
  ).toBeVisible();
  await expectNoSidewaysScroll(page);
  const reference = page.url().split("/").pop()!;

  // It is listed under upcoming trips.
  await page.goto("/account/trips");
  await expect(
    page.getByRole("link", { name: new RegExp(reference) }),
  ).toBeVisible();

  // Cancelling shows the conditions and the cost before anything happens.
  await page.getByRole("link", { name: new RegExp(reference) }).click();
  await page.getByRole("button", { name: "Cancel this trip" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Cancellation conditions" }),
  ).toBeVisible();
  await expect(
    dialog.getByText("Cancellation charge", { exact: true }),
  ).toBeVisible();
  // The estimate is not a confirmed price, so no charge is stated as money.
  await expect(dialog.getByText("Not known yet")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel this trip" }).click();

  await expect(main.getByText("Cancelled", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cancel this trip" }),
  ).toHaveCount(0);

  await page.goto("/account/trips");
  await page.getByRole("tab", { name: "Past" }).click();
  await expect(
    page.getByRole("link", { name: new RegExp(reference) }),
  ).toBeVisible();
  await operator.close();
});

test("a customer accepts the operator's quote after reading its conditions", async ({
  browser,
}) => {
  test.slow();
  const { operator, aircraftId } = await listedJet(browser, false);
  const { page, passengerId } = await newCustomer(browser);
  const searched = await searchFor(page, aircraftId);
  expect(searched.price).toBeNull();
  const reference = await requestThroughApi(page, searched, passengerId);

  const main = page.getByRole("main");
  await page.goto(`/account/trips/${reference}`);
  await expect(main.getByText(/Price on request/).first()).toBeVisible();

  await sendQuote(operator, reference);
  await page.reload();
  await expect(main.getByText("Quote", { exact: true })).toBeVisible();
  await expect(main.getByText(/Valid until/)).toBeVisible();
  await expect(
    main.getByText(/Free cancellation until 72 hours/).first(),
  ).toBeVisible();
  await expectNoSidewaysScroll(page);

  await main.getByRole("button", { name: "Accept quote" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText(/Free cancellation until 72 hours/),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Accept quote" }).click();

  await expect(
    main.getByText("Awaiting payment", { exact: true }).first(),
  ).toBeVisible();
  await expect(main.getByText("Confirmed price").first()).toBeVisible();
  await expect(main.getByText("You accepted this quote.")).toBeVisible();
  await operator.close();
});

test("a customer answers the operator's question and asks for a change", async ({
  browser,
}) => {
  test.slow();
  const { operator, aircraftId } = await listedJet(browser, true);
  const { page, passengerId } = await newCustomer(browser);
  const searched = await searchFor(page, aircraftId);
  const reference = await requestThroughApi(page, searched, passengerId);
  await askQuestion(operator, reference, "How much luggage will you carry?");

  const main = page.getByRole("main");
  await page.goto(`/account/trips/${reference}`);
  await expect(
    main.getByText("Clarification needed", { exact: true }),
  ).toBeVisible();
  await expect(
    main.getByText("How much luggage will you carry?"),
  ).toBeVisible();

  await page
    .getByRole("textbox", { name: "Your answer" })
    .fill("Three soft bags");
  await page.getByRole("button", { name: "Send answer" }).click();
  await expect(main.getByText("Three soft bags")).toBeVisible();
  await expect(
    main.getByText("Awaiting operator", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Your answer" })).toHaveCount(
    0,
  );

  await page
    .getByRole("textbox", { name: "Ask for a change" })
    .fill("Could we leave an hour later?");
  await page.getByRole("button", { name: "Send change request" }).click();
  await expect(main.getByText("Waiting for an answer")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Ask for a change" }),
  ).toHaveCount(0);
  await operator.close();
});
