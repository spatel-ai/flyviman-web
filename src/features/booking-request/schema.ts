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
