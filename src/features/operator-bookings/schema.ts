import { z } from "zod";

// The API's limits: a cancellation reason is 3 to 500 characters.
export const cancelSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Give a reason of at least 3 characters.")
    .max(500, "Use at most 500 characters."),
});

export type CancelValues = z.input<typeof cancelSchema>;
