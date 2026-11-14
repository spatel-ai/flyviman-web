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
    { message: "Enter an amount in rupees, for example 15000." },
  );

/** A number field that may be left empty (not set). */
const optionalNumber = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (Number.isFinite(Number(value)) &&
          Number(value) >= min &&
          Number(value) <= max),
      { message },
    );

export const operatorPricingSchema = z
  .object({
    minBillableHours: optionalNumber(0.5, 12, "Between 0.5 and 12 hours."),
    positioningPercent: optionalNumber(0, 200, "Between 0 and 200 percent."),
    freeWithinKm: optionalNumber(0, 1000, "Between 0 and 1,000 km."),
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
      percent == null
        ? null
        : Math.round(numberOrNull(values.freeWithinKm) ?? 0),
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
