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
  summary: string;
  charges: { hours: string; percent: string }[];
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

const whole = (value: string, max: number) =>
  /^\d{1,5}$/.test(value.trim()) && Number(value) <= max;

/**
 * The quote form's rules, as the API's: an amount above zero up to ₹10
 * crore, valid at least an hour ahead and never after the first departure,
 * cancellation charges with the longest notice first, each notice once.
 * A factory, so `now` and the departure are given (and testable).
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
      summary: z
        .string()
        .trim()
        .min(1, "Say what the customer can cancel, and when")
        .max(2000, "Keep this under 2,000 characters"),
      charges: z.array(z.object({ hours: z.string(), percent: z.string() })),
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

      let previous = Infinity;
      values.charges.forEach((charge, index) => {
        if (!whole(charge.hours, 8760)) {
          issue(["charges", index, "hours"], "Whole hours, 0 to 8760");
        } else if (Number(charge.hours) >= previous) {
          issue(
            ["charges", index, "hours"],
            "Longest notice first, each notice once",
          );
        } else {
          previous = Number(charge.hours);
        }
        if (!whole(charge.percent, 100)) {
          issue(["charges", index, "percent"], "Whole percent, 0 to 100");
        }
      });
      if (values.charges.length > 10) issue(["charges"], "At most 10 charges");

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
 * The one place the form becomes the request. W3-11 changes the operator's
 * amount to "their own price" with the engine adding Flyviman's commission,
 * fees and tax: change `price` handling here and nothing else.
 */
export function toReviseQuoteBody(values: QuoteValues): ReviseQuoteBody {
  return {
    totalMinor: rupeesToPaise(values.price) ?? 0,
    currency: "INR",
    validUntil: localToUtc(values.validDate, values.validTime, QUOTE_ZONE),
    conditions: {
      summary: values.summary.trim(),
      charges: values.charges.map((charge) => ({
        minHoursBeforeDeparture: Number(charge.hours),
        chargePercent: Number(charge.percent),
      })),
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
 * A first quote starts from the cancellation terms the customer was shown;
 * a revision from the newest quote, so only what changes is retyped.
 */
export function quoteDefaults(
  request: Pick<Detail, "quotes" | "cancellationTerms" | "legs">,
  now: number,
): QuoteValues {
  const previous = request.quotes[0];
  const conditions = previous?.conditions;
  const charges = conditions?.charges ?? request.cancellationTerms.charges;
  return {
    price: previous ? paiseToRupees(previous.price.amountMinor) : "",
    ...defaultValidity(request.legs[0].departureAt, now),
    summary: conditions?.summary ?? request.cancellationTerms.summary,
    charges: charges.map((charge) => ({
      hours: String(charge.minHoursBeforeDeparture),
      percent: String(charge.chargePercent),
    })),
    inclusions: (conditions?.inclusions ?? []).join("\n"),
    exclusions: (conditions?.exclusions ?? []).join("\n"),
  };
}
