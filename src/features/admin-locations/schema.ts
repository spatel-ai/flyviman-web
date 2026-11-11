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

/** Rupees entered in the form; converted to paise for the API. */
const rupees = z.union([z.string(), z.number()]).transform((value, ctx) => {
  const text = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    ctx.addIssue({
      code: "custom",
      message: "Enter an amount in rupees, with at most two decimals",
    });
    return z.NEVER;
  }
  const amount = Number(text);
  if (amount > 10_000_000) {
    ctx.addIssue({ code: "custom", message: "Too large" });
    return z.NEVER;
  }
  return amount;
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
  /** When false, charges are cleared on save. */
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

function chargeRow(values: LocationValues) {
  return {
    category: values.chargeCategory,
    landingMinor: Math.round(values.landingRupees * 100),
    parkingMinor: Math.round(values.parkingRupees * 100),
    handlingMinor: Math.round(values.handlingRupees * 100),
  };
}

export function toCreateBody(values: LocationValues) {
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
    charges: values.hasCharges
      ? { currency: "INR", categories: [chargeRow(values)] }
      : null,
  };
}

/**
 * Builds a PATCH body. Existing charge categories the form does not edit
 * are kept, so a deactivate-only save cannot wipe a multi-category set.
 */
export function toUpdateBody(
  values: LocationValues,
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
  if (!values.hasCharges) {
    body.charges = null;
  } else {
    const row = chargeRow(values);
    const others =
      existing?.categories.filter(
        (charge) => charge.category !== values.chargeCategory,
      ) ?? [];
    body.charges = {
      currency: existing?.currency ?? "INR",
      categories: [row, ...others],
    };
  }
  return body;
}
