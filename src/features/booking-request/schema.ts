import { z } from "zod";

/** The request form. `limit` is the search's passenger count. */
export function requestSchema(limit: number) {
  return z.object({
    passengerIds: z
      .array(z.string())
      .min(1, "Choose at least the lead passenger.")
      .max(
        limit,
        `This search is for ${limit} passenger${limit === 1 ? "" : "s"}. Choose no more than that.`,
      ),
    specialRequests: z
      .string()
      .trim()
      .max(1000, "Use at most 1,000 characters."),
  });
}

export type RequestValues = z.input<ReturnType<typeof requestSchema>>;
export type RequestOutput = z.output<ReturnType<typeof requestSchema>>;

/**
 * The empty-leg request form. `seats` is the offer's seats available; the
 * passengers chosen may not outnumber `passengerCount` (the API's limits).
 */
export function emptyLegRequestSchema(seats: number) {
  return z
    .object({
      passengerCount: z.coerce
        .number<string>()
        .int()
        .min(1, "Choose how many people are flying.")
        .max(
          seats,
          `This offer has ${seats} seat${seats === 1 ? "" : "s"}. Choose no more than that.`,
        ),
      passengerIds: z
        .array(z.string())
        .min(1, "Choose at least the lead passenger."),
      specialRequests: z
        .string()
        .trim()
        .max(1000, "Use at most 1,000 characters."),
    })
    .refine((values) => values.passengerIds.length <= values.passengerCount, {
      path: ["passengerIds"],
      message: "Choose no more passengers than are flying.",
    });
}

export type EmptyLegRequestValues = z.input<
  ReturnType<typeof emptyLegRequestSchema>
>;
export type EmptyLegRequestOutput = z.output<
  ReturnType<typeof emptyLegRequestSchema>
>;
