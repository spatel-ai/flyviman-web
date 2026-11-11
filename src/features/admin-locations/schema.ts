import { z } from "zod";
import type { Schemas } from "@/lib/api/types";

const LOCATION_TYPES = ["AIRPORT", "HELIPORT", "CITY", "LANDING_SITE"] as const;

const AIRCRAFT_CATEGORIES = [
  "TURBOPROP",
  "LIGHT_JET",
  "MIDSIZE_JET",
  "HEAVY_JET",
  "HELICOPTER",
  "AIR_AMBULANCE_FIXED",
  "AIR_AMBULANCE_ROTARY",
] as const;

/** Empty string or three letters; stored as null when blank. */
const optionalIata = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(
    z.union([
      z.literal(""),
      z
        .string()
        .length(3, "IATA must be three letters")
        .regex(/^[A-Z]{3}$/, "IATA must be three letters"),
    ]),
  );

const optionalIcao = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(
    z.union([
      z.literal(""),
      z
        .string()
        .length(4, "ICAO must be four letters")
        .regex(/^[A-Z]{4}$/, "ICAO must be four letters"),
    ]),
  );

const MAX_PAISE = 1_000_000_000; // ₹1 crore

/**
 * Rupees as typed ("2500.50") to integer paise, from the text alone so no
 * floating point is involved. Blank is null: no charge set. Undefined when
 * the text is not a valid amount.
 */
export function rupeesToPaise(
  value: string | number,
): number | null | undefined {
  const text = String(value).trim();
  if (text === "") return null;
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) return undefined;
  const paise =
    Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return paise > MAX_PAISE ? undefined : paise;
}

/** Integer paise back to the rupee text the form shows. */
export function paiseToRupees(paise: number): string {
  const fraction = paise % 100;
  const whole = String(Math.floor(paise / 100));
  return fraction === 0
    ? whole
    : `${whole}.${String(fraction).padStart(2, "0")}`;
}

/** Rupees entered in the form; converted to paise (or null when blank). */
const rupees = z.union([z.string(), z.number()]).transform((value, ctx) => {
  const paise = rupeesToPaise(value);
  if (paise === undefined) {
    ctx.addIssue({
      code: "custom",
      message: "Enter an amount in rupees, with at most two decimals",
    });
    return z.NEVER;
  }
  return paise;
});

export const locationSchema = z.object({
  type: z.enum(LOCATION_TYPES, { error: "Choose a type" }),
  name: z.string().trim().min(2, "Enter a name").max(200),
  iata: optionalIata,
  icao: optionalIcao,
  city: z.string().trim().max(100),
  state: z.string().trim().max(100),
  country: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(
      z
        .string()
        .length(2, "Use a two-letter country code")
        .regex(/^[A-Z]{2}$/, "Use a two-letter country code"),
    ),
  latitude: z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z.coerce.number({ error: "Enter a latitude" }).min(-90).max(90),
  ),
  longitude: z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z.coerce.number({ error: "Enter a longitude" }).min(-180).max(180),
  ),
  timeZone: z.string().trim().min(1, "Enter a time zone"),
  runwayLengthM: z.union([
    z.literal(""),
    z.coerce.number().int().min(1).max(6000),
  ]),
  nightOperations: z.enum(["unknown", "yes", "no"]),
  helicopterApproved: z.boolean(),
  isActive: z.boolean(),
  /** When false, charges for every category are cleared on save. */
  hasCharges: z.boolean(),
  chargeCategory: z.enum(AIRCRAFT_CATEGORIES),
  landingRupees: rupees,
  parkingRupees: rupees,
  handlingRupees: rupees,
});

export type LocationInput = z.input<typeof locationSchema>;
export type LocationValues = z.output<typeof locationSchema>;

function capabilitiesBody(values: LocationValues) {
  return {
    runwayLengthM: values.runwayLengthM === "" ? null : values.runwayLengthM,
    nightOperations:
      values.nightOperations === "unknown"
        ? null
        : values.nightOperations === "yes",
    helicopterApproved: values.helicopterApproved,
  };
}

export type ChargeRow = {
  category: LocationValues["chargeCategory"];
  landingMinor: number;
  parkingMinor: number;
  handlingMinor: number;
};

/** The category on screen, or null when all three amounts are blank. */
function chargeRow(values: LocationValues): ChargeRow | null {
  const { landingRupees, parkingRupees, handlingRupees } = values;
  if (
    landingRupees === null &&
    parkingRupees === null &&
    handlingRupees === null
  ) {
    return null;
  }
  return {
    category: values.chargeCategory,
    landingMinor: landingRupees ?? 0,
    parkingMinor: parkingRupees ?? 0,
    handlingMinor: handlingRupees ?? 0,
  };
}

/**
 * Every category's charges: the one on screen plus the others the form holds
 * (stored rows and rows typed before switching category). Null when none.
 */
function chargesBody(
  values: LocationValues,
  others: ChargeRow[],
  currency = "INR",
) {
  if (!values.hasCharges) return null;
  const current = chargeRow(values);
  const categories = [
    ...(current ? [current] : []),
    ...others.filter((row) => row.category !== values.chargeCategory),
  ];
  return categories.length > 0 ? { currency, categories } : null;
}

export function toCreateBody(values: LocationValues, others: ChargeRow[] = []) {
  return {
    type: values.type,
    name: values.name,
    iata: values.iata || null,
    icao: values.icao || null,
    city: values.city || null,
    state: values.state || null,
    country: values.country,
    latitude: values.latitude,
    longitude: values.longitude,
    timeZone: values.timeZone,
    capabilities: capabilitiesBody(values),
    charges: chargesBody(values, others),
  };
}

/**
 * Builds a PATCH body. `others` holds every category not on screen (stored
 * rows included), so a deactivate-only save cannot wipe a multi-category set
 * and a category nobody filled in is never written as ₹0.
 */
export function toUpdateBody(
  values: LocationValues,
  others: ChargeRow[] = [],
  existing?: Schemas["AdminLocationResponseDto"]["charges"],
) {
  const body: Record<string, unknown> = {
    type: values.type,
    name: values.name,
    iata: values.iata || null,
    icao: values.icao || null,
    city: values.city || null,
    state: values.state || null,
    country: values.country,
    latitude: values.latitude,
    longitude: values.longitude,
    timeZone: values.timeZone,
    capabilities: capabilitiesBody(values),
    isActive: values.isActive,
  };
  body.charges = chargesBody(values, others, existing?.currency ?? "INR");
  return body;
}
