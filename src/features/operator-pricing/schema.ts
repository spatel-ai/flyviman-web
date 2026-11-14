import { z } from "zod";
import type { Schemas } from "@/lib/api/types";
import { paiseToRupees, rupeesToPaise } from "@/lib/format/money";

type Pricing = Schemas["OperatorPricingResponseDto"];
type Body = Schemas["OperatorPricingDto"];

const rupees = z
  .string()
  .trim()
  .refine(
    (value) => {
      try {
        rupeesToPaise(value);
        return true;
      } catch {
        return false;
      }
    },
    {
      message: "Enter an amount in rupees up to ₹10 crore, for example 15000.",
    },
  );

/**
 * A number field that may be left empty (not set). Plain decimals only
 * ("1e1" and "0x10" are refused), with at most `decimals` places, matching
 * what the API accepts so it never refuses what the form let through.
 */
const optionalNumber = (
  min: number,
  max: number,
  message: string,
  decimals = 2,
) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (new RegExp(
          decimals > 0 ? `^\\d+(\\.\\d{1,${decimals}})?$` : "^\\d+$",
        ).test(value) &&
          Number(value) >= min &&
          Number(value) <= max),
      { message },
    );

export const operatorPricingSchema = z
  .object({
    minBillableHours: optionalNumber(0.5, 12, "Between 0.5 and 12 hours."),
    // The API keeps the factor to two decimals, so the percent is whole.
    positioningPercent: optionalNumber(
      0,
      200,
      "A whole number between 0 and 200 percent.",
      0,
    ),
    freeWithinKm: optionalNumber(
      0,
      1000,
      "A whole number between 0 and 1,000 km.",
      0,
    ),
    landingFallback: rupees,
    handlingFallback: rupees,
  })
  .refine(
    (values) => values.freeWithinKm === "" || values.positioningPercent !== "",
    {
      path: ["positioningPercent"],
      message: "Set the positioning rate to use a free distance.",
    },
  );

export type OperatorPricingValues = z.infer<typeof operatorPricingSchema>;

const numberOrNull = (value: string) => (value === "" ? null : Number(value));

export function toOperatorPricingBody(values: OperatorPricingValues): Body {
  const percent = numberOrNull(values.positioningPercent);
  return {
    minBillableHours: numberOrNull(values.minBillableHours),
    positioningRateFactor: percent == null ? null : percent / 100,
    freeWithinKm:
      percent == null ? null : (numberOrNull(values.freeWithinKm) ?? 0),
    landingFallbackMinor: rupeesToPaise(values.landingFallback),
    handlingFallbackMinor: rupeesToPaise(values.handlingFallback),
  };
}

export function fromOperatorPricing(pricing: Pricing): OperatorPricingValues {
  const text = (value: number | null) => (value == null ? "" : String(value));
  return {
    minBillableHours: text(pricing.minBillableHours),
    positioningPercent:
      pricing.positioningRateFactor == null
        ? ""
        : String(Math.round(pricing.positioningRateFactor * 100)),
    freeWithinKm: text(pricing.freeWithinKm),
    landingFallback: paiseToRupees(pricing.landingFallbackMinor),
    handlingFallback: paiseToRupees(pricing.handlingFallbackMinor),
  };
}

/** API field names that differ from this form's. */
export const OPERATOR_PRICING_ALIASES = {
  positioningRateFactor: "positioningPercent",
  landingFallbackMinor: "landingFallback",
  handlingFallbackMinor: "handlingFallback",
} as const;
