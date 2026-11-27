import { expect, test } from "@playwright/test";
import { API_URL } from "./support/api";
import {
  listedJet,
  newCustomer,
  requestThroughApi,
  searchFor,
  sendQuote,
} from "./support/bookings";
import { csrf } from "./support/operators";

/** The trip page on a quoted request: timeline, passengers, documents, terms (W3-8, D-211, D-213). */

test("on a quoted trip the customer changes passengers and reads the timeline, documents and terms", async ({
  browser,
}) => {
  test.slow();
  const { operator, aircraftId } = await listedJet(browser, true);
  const { page, passengerId } = await newCustomer(browser);
  const saved = await page.request.post(`${API_URL}me/passengers`, {
    headers: await csrf(page),
    data: {
      firstName: "Arnav",
      lastName: "Bose",
      dateOfBirth: "1992-02-02",
      gender: "MALE",
      nationality: "IN",
    },
  });
  expect(saved.status()).toBe(201);
  const reference = await requestThroughApi(
    page,
    await searchFor(page, aircraftId),
    passengerId,
  );
  await sendQuote(operator, reference);

  const main = page.getByRole("main");
  await page.goto(`/account/trips/${reference}`);

  // Timeline: the request and the quote, the quote labelled (rule 1).
  const timeline = page
    .getByRole("heading", { name: "Timeline" })
    .locator("..");
  await expect(timeline.getByText("Request sent")).toBeVisible();
  await expect(timeline.getByText("Quote received")).toBeVisible();
  await expect(main.getByText("Quote", { exact: true }).first()).toBeVisible();

  // With a quote the terms appear once, and the estimate is a small secondary line.
  await expect(
    main.getByRole("heading", { name: "Cancellation conditions" }),
  ).toHaveCount(1);
  await expect(main.getByText("Earlier estimate")).toBeVisible();

  // Documents: the accepted terms, and no confirmation yet.
  const documents = page.getByRole("region", { name: "Documents" });
  await expect(
    documents.getByText("Cancellation terms shown when you sent this request"),
  ).toBeVisible();
  await expect(
    documents.getByText("Available once the booking is confirmed"),
  ).toBeVisible();
  await expect(
    documents.getByRole("link", { name: "Booking confirmation" }),
  ).toHaveCount(0);

  // Change passengers replaces them.
  await main.getByRole("button", { name: "Change passengers" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: "Kavya Ramaswamy" }).click();
  await dialog.getByRole("checkbox", { name: "Arnav Bose" }).click();
  await dialog.getByRole("button", { name: "Save passengers" }).click();
  const passengers = page.getByRole("region", { name: "Passengers" });
  await expect(passengers.getByText("Arnav Bose")).toBeVisible();
  await expect(passengers.getByText("Kavya Ramaswamy")).toHaveCount(0);
  await expect(timeline.getByText("Passengers updated")).toBeVisible();
  await operator.close();
});
