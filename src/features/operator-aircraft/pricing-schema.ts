import { z } from "zod";
import type { Schemas } from "@/lib/api/types";
import { paiseToRupees, rupeesToPaise } from "@/lib/format/money";

type Pricing = Schemas["AircraftPricingResponseDto"];
type Body = Schemas["AircraftPricingDto"];
export type PricingModel = Schemas["AircraftPricingModel"];

/** Most routes one aircraft lists (the API's limit). */
export const MAX_FIXED_ROUTES = 50;

export const PRICING_MODELS: { value: PricingModel; label: string }[] = [
  { value: "HOURLY", label: "By the hour" },
  { value: "SECTOR", label: "One price per flight" },
  { value: "FIXED_ROUTE", label: "Fixed prices per route" },
];

const parses = (value: string) => {
  try {
    rupeesToPaise(value);
    return true;
  } catch {
    return false;
  }
};

/** An amount in rupees that may be empty; when set, at least ₹1 (the API's floor). */
const optionalRupees = (message: string) =>
  z
    .string()
    .trim()
    .refine(parses, { message })
    .refine(
      (value) => {
        try {
          const paise = rupeesToPaise(value);
          return paise === null || paise >= 100;
        } catch {
          return true;
        }
      },
      { message: "At least ₹1, or leave empty." },
    );

export const routeSchema = z.object({
  originId: z.string().min(1, "Choose where the route starts."),
  destinationId: z.string().min(1, "Choose where the route ends."),
  amount: optionalRupees(
    "Enter the price in rupees, for example 250000.",
  ).refine((value) => value !== "", { message: "Enter the price." }),
});

export const aircraftPricingSchema = z
  .object({
    // The API takes ₹1 to ₹10 crore an hour; empty means "price on request".
    hourlyRate: optionalRupees(
      "Enter the rate in rupees up to ₹10 crore, for example 180000.",
    ),
    sectorRate: optionalRupees(
      "Enter the price in rupees up to ₹10 crore, for example 250000.",
    ),
    taxInclusive: z.boolean(),
    commissionInclusive: z.boolean(),
    minBillableHours: z
      .string()
      .trim()
      .refine(
        (value) =>
          value === "" ||
          (/^\d+(\.\d{1,2})?$/.test(value) &&
            Number(value) >= 0.5 &&
            Number(value) <= 12),
        { message: "Between 0.5 and 12 hours, or leave empty." },
      ),
    minBillableHoursPer: z.enum(["LEG", "DAY"]),
    routes: z
      .array(routeSchema)
      .max(MAX_FIXED_ROUTES, `At most ${MAX_FIXED_ROUTES} routes.`),
  })
  .superRefine((values, ctx) => {
    // A route is priced in either direction and listed once.
    const seen = new Set<string>();
    values.routes.forEach((route, index) => {
      if (!route.originId || !route.destinationId) return;
      if (route.originId === route.destinationId) {
        ctx.addIssue({
          code: "custom",
          path: ["routes", index, "destinationId"],
          message: "The route must end somewhere other than where it starts.",
        });
        return;
      }
      const key = [route.originId, route.destinationId].sort().join("|");
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["routes", index, "destinationId"],
          message: "This route is already listed (either direction).",
        });
      }
      seen.add(key);
    });
  });

export type AircraftPricingValues = z.infer<typeof aircraftPricingSchema>;

export function fromAircraftPricing(pricing: Pricing): AircraftPricingValues {
  return {
    hourlyRate: paiseToRupees(pricing.hourlyRateMinor),
    sectorRate: paiseToRupees(pricing.sectorRateMinor),
    taxInclusive: pricing.taxInclusive,
    commissionInclusive: pricing.commissionInclusive,
    minBillableHours:
      pricing.minBillableHours == null ? "" : String(pricing.minBillableHours),
    minBillableHoursPer: pricing.minBillableHoursPer ?? "LEG",
    routes: (pricing.fixedRoutes ?? []).map((route) => ({
      originId: route.originId,
      destinationId: route.destinationId,
      amount: paiseToRupees(route.amountMinor),
    })),
  };
}

/**
 * The request body. Only the current pricing model's figures are sent: a
 * field left out keeps its stored value, so switching the model never wipes
 * the rates of the others. The hourly rate is required by the API, so a
 * model that hides it sends the stored one back.
 */
export function toAircraftPricingBody(
  values: AircraftPricingValues,
  model: PricingModel,
): Body {
  const hours =
    values.minBillableHours === "" ? null : Number(values.minBillableHours);
  return {
    hourlyRateMinor: rupeesToPaise(values.hourlyRate),
    taxInclusive: values.taxInclusive,
    commissionInclusive: values.commissionInclusive,
    minBillableHours: hours,
    // Per day applies to hourly aircraft with a minimum.
    ...(model === "HOURLY" && hours !== null
      ? { minBillableHoursPer: values.minBillableHoursPer }
      : {}),
    ...(model === "SECTOR"
      ? { sectorRateMinor: rupeesToPaise(values.sectorRate) }
      : {}),
    ...(model === "FIXED_ROUTE"
      ? {
          fixedRoutes: values.routes.map((route) => ({
            originId: route.originId,
            destinationId: route.destinationId,
            amountMinor: rupeesToPaise(route.amount) ?? 0,
          })),
        }
      : {}),
  };
}

/** API field names that differ from this form's. */
export const AIRCRAFT_PRICING_ALIASES = {
  hourlyRateMinor: "hourlyRate",
  sectorRateMinor: "sectorRate",
} as const;
