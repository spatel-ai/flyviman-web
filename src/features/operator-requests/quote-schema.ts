import { z } from "zod";
import type { Schemas } from "@/lib/api/types";
import { localToUtc, utcToLocal } from "@/lib/format/zoned";
import { paiseToRupees, rupeesToPaise } from "@/lib/format/money";

type Detail = Schemas["OperatorBookingRequestDetailDto"];
export type ReviseQuoteBody = Schemas["ReviseQuoteDto"];

/** Validity is entered in India time, as everything operators see is. */
export const QUOTE_ZONE = "Asia/Kolkata";
const HOUR_MS = 3_600_000;
/** The API's default validity (BOOKING_HOLD_HOURS). */
export const DEFAULT_VALIDITY_HOURS = 48;
const MAX_LINES = 20;
const MAX_LINE_LENGTH = 200;

export interface QuoteValues {
  /** Rupees as typed. Labelled "Your price". */
  price: string;
  validDate: string;
  validTime: string;
  /** One per line. */
  inclusions: string;
  exclusions: string;
}

function lines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * The quote form's rules, as the API's: the operator's price above zero up
 * to ₹10 crore (the API also refuses a price whose customer total, with
 * Flyviman's charges and tax, would pass ₹10 crore), valid at least an hour
 * ahead and never after the first departure. The cancellation terms are
 * Flyviman's (D-172), not the operator's. A factory, so `now` and the
 * departure are given (and testable).
 */
export function quoteSchema({
  departureAt,
  now = Date.now,
}: {
  departureAt: string;
  now?: () => number;
}) {
  return z
    .object({
      price: z.string(),
      validDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
      validTime: z.string().regex(/^\d{2}:\d{2}$/, "Choose a time"),
      inclusions: z.string(),
      exclusions: z.string(),
    })
    .superRefine((values, ctx) => {
      const issue = (path: (string | number)[], message: string) =>
        ctx.addIssue({ code: "custom", path, message });

      try {
        const paise = rupeesToPaise(values.price);
        if (paise === null) issue(["price"], "Enter your price");
        else if (paise < 100) issue(["price"], "Enter at least ₹1");
      } catch (error) {
        issue(
          ["price"],
          error instanceof RangeError
            ? "The most you can quote is ₹10 crore"
            : "Enter an amount in rupees, for example 180000 or 2500.50",
        );
      }

      if (
        /^\d{4}-\d{2}-\d{2}$/.test(values.validDate) &&
        /^\d{2}:\d{2}$/.test(values.validTime)
      ) {
        const until = Date.parse(
          localToUtc(values.validDate, values.validTime, QUOTE_ZONE),
        );
        if (until < now() + HOUR_MS) {
          issue(["validDate"], "Must be at least an hour from now");
        } else if (until > Date.parse(departureAt)) {
          issue(["validDate"], "Cannot be after the departure");
        }
      }

      for (const field of ["inclusions", "exclusions"] as const) {
        const list = lines(values[field]);
        if (list.length > MAX_LINES) {
          issue([field], `At most ${MAX_LINES} lines`);
        } else if (list.some((line) => line.length > MAX_LINE_LENGTH)) {
          issue([field], `Keep each line under ${MAX_LINE_LENGTH} characters`);
        }
      }
    });
}

/**
 * The one place the form becomes the request: the operator's own price;
 * Flyviman's pricing rules add commission, fees and tax for the customer
 * (D-172).
 */
export function toReviseQuoteBody(values: QuoteValues): ReviseQuoteBody {
  return {
    operatorPriceMinor: rupeesToPaise(values.price) ?? 0,
    currency: "INR",
    validUntil: localToUtc(values.validDate, values.validTime, QUOTE_ZONE),
    conditions: {
      inclusions: lines(values.inclusions),
      exclusions: lines(values.exclusions),
    },
  };
}

/** 48 hours from now, but never later than the departure. */
export function defaultValidity(
  departureAt: string,
  now: number,
): { validDate: string; validTime: string } {
  const until = Math.min(
    now + DEFAULT_VALIDITY_HOURS * HOUR_MS,
    Date.parse(departureAt),
  );
  const local = utcToLocal(new Date(until).toISOString(), QUOTE_ZONE);
  return { validDate: local.date, validTime: local.time };
}

/**
 * A revision starts from the newest quote, so only what changes is retyped:
 * the operator's own price (never the customer's total, which carries
 * Flyviman's charges), blank for a quote sent before quotes were priced
 * from it.
 */
export function quoteDefaults(
  request: Pick<Detail, "quotes" | "legs">,
  now: number,
): QuoteValues {
  const previous = request.quotes[0];
  const conditions = previous?.conditions;
  return {
    price: previous?.operatorPrice
      ? paiseToRupees(previous.operatorPrice.amountMinor)
      : "",
    ...defaultValidity(request.legs[0].departureAt, now),
    inclusions: (conditions?.inclusions ?? []).join("\n"),
    exclusions: (conditions?.exclusions ?? []).join("\n"),
  };
}
