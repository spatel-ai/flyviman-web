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
  })
  .refine((values) => values.originId !== values.destinationId, {
    path: ["destinationId"],
    message: "Choose a destination different from the origin.",
  });

export type SearchValues = z.input<typeof searchSchema>;
export type SearchOutput = z.output<typeof searchSchema>;

type Body = Schemas["CharterSearchDto"];

/** The API body: the departure as an instant, from India time. */
export function toSearchBody(values: SearchOutput): Body {
  return {
    originId: values.originId,
    destinationId: values.destinationId,
    departureAt: localToUtc(values.date, values.time, SEARCH_ZONE),
    passengerCount: values.passengerCount,
    ...(values.kind === "charter" && values.category !== "ANY"
      ? { category: values.category as NonNullable<Body["category"]> }
      : {}),
  };
}
