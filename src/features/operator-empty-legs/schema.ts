import { z } from "zod";
import type { EmptyLegInput, OperatorEmptyLeg } from "@/lib/empty-legs/types";
import { paiseToRupees, rupeesToPaise } from "@/lib/format/money";
import { localToUtc, utcToLocal } from "@/lib/format/zoned";

function paise(value: string): number | null {
  try {
    return rupeesToPaise(value);
  } catch {
    return null;
  }
}

const day = z.string().min(1, "Choose a day.");
const time = z.string().min(1, "Choose a time.");

export const emptyLegSchema = z
  .object({
    aircraftId: z.string().min(1, "Choose an aircraft."),
    originId: z.string().min(1, "Choose where it departs."),
    destinationId: z.string().min(1, "Choose where it arrives."),
    fromDay: day,
    fromTime: time,
    toDay: day,
    toTime: time,
    seatsAvailable: z
      .string()
      .trim()
      .regex(/^[1-9]\d{0,2}$/, "Enter a whole number of seats, at least 1."),
    price: z
      .string()
      .trim()
      .refine((value) => (paise(value) ?? 0) > 0, {
        message: "Enter a price in rupees above 0, up to ₹10 crore.",
      }),
    validDay: day,
    validTime: time,
    conditions: z
      .string()
      .trim()
      .min(
        10,
        "Say what applies: for example how changes and cancellation work.",
      )
      .max(2000, "Keep the conditions to 2,000 characters."),
  })
  .superRefine((value, ctx) => {
    if (value.originId && value.originId === value.destinationId) {
      ctx.addIssue({
        code: "custom",
        path: ["destinationId"],
        message: "The destination must differ from the departure airport.",
      });
    }
    if (
      value.toDay &&
      value.validDay &&
      `${value.validDay}T${value.validTime}` > `${value.toDay}T${value.toTime}`
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["validDay"],
        message: "The offer must not stay valid past the latest departure.",
      });
    }
    // Same zone, so the wall-clock strings sort in time order.
    if (
      value.fromDay &&
      value.toDay &&
      `${value.toDay}T${value.toTime}` < `${value.fromDay}T${value.fromTime}`
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["toDay"],
        message: "The window must not end before it starts.",
      });
    }
  });

export type EmptyLegValues = z.infer<typeof emptyLegSchema>;

export const EMPTY_VALUES: EmptyLegValues = {
  aircraftId: "",
  originId: "",
  destinationId: "",
  fromDay: "",
  fromTime: "",
  toDay: "",
  toTime: "",
  seatsAvailable: "",
  price: "",
  validDay: "",
  validTime: "",
  conditions: "",
};

/** The API's field names mapped to the form's. */
export const EMPTY_LEG_ALIASES = {
  departureFrom: "fromDay",
  departureTo: "toDay",
  validUntil: "validDay",
  priceMinor: "price",
} as const;

/**
 * The request body. Times were typed in the departure airport's local time,
 * so they are converted to UTC with that airport's zone.
 */
export function toEmptyLegBody(
  values: EmptyLegValues,
  zone: string,
): EmptyLegInput {
  return {
    aircraftId: values.aircraftId,
    originId: values.originId,
    destinationId: values.destinationId,
    departureFrom: localToUtc(values.fromDay, values.fromTime, zone),
    departureTo: localToUtc(values.toDay, values.toTime, zone),
    seatsAvailable: Number(values.seatsAvailable),
    priceMinor: paise(values.price) ?? 0,
    validUntil: localToUtc(values.validDay, values.validTime, zone),
    conditions: values.conditions.trim(),
  };
}

/** Form values for an existing offer, in its origin's local time. */
export function fromOffer(
  offer: OperatorEmptyLeg,
  zone: string,
): EmptyLegValues {
  const from = utcToLocal(offer.departureFrom, zone);
  const to = utcToLocal(offer.departureTo, zone);
  const valid = utcToLocal(offer.validUntil, zone);
  return {
    aircraftId: offer.aircraft.id ?? "",
    originId: offer.origin.id,
    destinationId: offer.destination.id,
    fromDay: from.date,
    fromTime: from.time,
    toDay: to.date,
    toTime: to.time,
    seatsAvailable: String(offer.seatsAvailable),
    price: paiseToRupees(offer.price.amountMinor),
    validDay: valid.date,
    validTime: valid.time,
    conditions: offer.conditions,
  };
}
