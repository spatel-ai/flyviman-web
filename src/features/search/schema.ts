import { z } from "zod";
import { localToUtc } from "@/lib/format/zoned";
import type { Schemas } from "@/lib/api/types";

/** Trips are entered in India time (open decision 12: India only). */
export const SEARCH_ZONE = "Asia/Kolkata";

export const CHARTER_CATEGORIES = [
  { value: "ANY", label: "Any aircraft" },
  { value: "TURBOPROP", label: "Turboprop" },
  { value: "LIGHT_JET", label: "Light jet" },
  { value: "MIDSIZE_JET", label: "Midsize jet" },
  { value: "HEAVY_JET", label: "Heavy jet" },
] as const;

export const searchSchema = z
  .object({
    kind: z.enum(["charter", "helicopter"]),
    originId: z.string().min(1, "Choose where you fly from."),
    destinationId: z.string().min(1, "Choose where you fly to."),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Choose a time."),
    passengerCount: z.coerce
      .number<string>()
      .int("Enter a whole number.")
      .min(1, "At least one passenger.")
      .max(50, "At most 50 passengers."),
    category: z.string(),
    tripType: z.enum(["ONE_WAY", "ROUND_TRIP"]).default("ONE_WAY"),
    returnDate: z.string().default(""),
    returnTime: z.string().default("18:00"),
  })
  .refine((values) => values.originId !== values.destinationId, {
    path: ["destinationId"],
    message: "Choose a destination different from the origin.",
  })
  .superRefine((values, context) => {
    if (values.tripType !== "ROUND_TRIP") return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.returnDate)) {
      context.addIssue({
        code: "custom",
        path: ["returnDate"],
        message: "Choose a return date.",
      });
    } else if (
      `${values.returnDate}T${values.returnTime}` <=
      `${values.date}T${values.time}`
    ) {
      // Same zone and zero-padded, so the strings order like the instants.
      context.addIssue({
        code: "custom",
        path: ["returnDate"],
        message: "Return must be after departure.",
      });
    }
  });

export type SearchValues = z.input<typeof searchSchema>;
export type SearchOutput = z.output<typeof searchSchema>;

/** `tripType` is left out for one way: the API defaults it to ONE_WAY. */
type Body = Omit<Schemas["CharterSearchDto"], "tripType"> &
  Partial<Pick<Schemas["CharterSearchDto"], "tripType">>;

/** The API body: the departure as an instant, from India time. */
export function toSearchBody(values: SearchOutput): Body {
  return {
    originId: values.originId,
    destinationId: values.destinationId,
    departureAt: localToUtc(values.date, values.time, SEARCH_ZONE),
    passengerCount: values.passengerCount,
    ...(values.tripType === "ROUND_TRIP"
      ? {
          tripType: "ROUND_TRIP" as const,
          returnAt: localToUtc(
            values.returnDate,
            values.returnTime,
            SEARCH_ZONE,
          ),
        }
      : {}),
    ...(values.kind === "charter" && values.category !== "ANY"
      ? { category: values.category as NonNullable<Body["category"]> }
      : {}),
  };
}
