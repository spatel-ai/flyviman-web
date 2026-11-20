import { z } from "zod";
import { REASON_MAX, REASON_MIN } from "@/lib/pricing-rules";

/** The API's limits (`/admin/cancellation-terms`). */
export const MAX_TIERS = 10;
export const MAX_NOTICE_HOURS = 8760;

function whole(min: number, max: number, what: string) {
  return z
    .string()
    .trim()
    .min(1, `Enter ${what}.`)
    .transform((text, ctx) => {
      const value = Number(text);
      if (!/^\d+$/.test(text) || !Number.isInteger(value)) {
        ctx.addIssue({ code: "custom", message: "Enter a whole number." });
        return z.NEVER;
      }
      if (value < min || value > max) {
        ctx.addIssue({
          code: "custom",
          message: `Enter a value from ${min} to ${max}.`,
        });
        return z.NEVER;
      }
      return value;
    });
}

const tier = z.object({
  minHoursBeforeDeparture: whole(0, MAX_NOTICE_HOURS, "the hours"),
  chargePercent: whole(0, 100, "a percent"),
});

/**
 * The tier table as the API checks it: 1 to 10 tiers, the longest notice
 * first and each notice once, ending at 0 hours, and a charge that never
 * falls as the notice shortens. A reason is required (rule 6).
 */
export const tiersSchema = z
  .object({
    tiers: z
      .array(tier)
      .min(1, "Add at least one tier.")
      .max(MAX_TIERS, `At most ${MAX_TIERS} tiers.`),
    reason: z
      .string()
      .trim()
      .min(REASON_MIN, `Say why, in at least ${REASON_MIN} characters.`)
      .max(REASON_MAX, `At most ${REASON_MAX} characters.`),
  })
  .superRefine(({ tiers }, ctx) => {
    for (let i = 1; i < tiers.length; i += 1) {
      if (
        tiers[i].minHoursBeforeDeparture >= tiers[i - 1].minHoursBeforeDeparture
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["tiers", i, "minHoursBeforeDeparture"],
          message: "Must be fewer hours than the tier above.",
        });
      } else if (tiers[i].chargePercent < tiers[i - 1].chargePercent) {
        ctx.addIssue({
          code: "custom",
          path: ["tiers", i, "chargePercent"],
          message: "Must be at least the charge for longer notice.",
        });
      }
    }
    const last = tiers.length - 1;
    if (last >= 0 && tiers[last].minHoursBeforeDeparture !== 0) {
      ctx.addIssue({
        code: "custom",
        path: ["tiers", last, "minHoursBeforeDeparture"],
        message:
          "The last tier starts at 0 hours, for late cancellations and no-shows.",
      });
    }
  });

export type TiersFormInput = {
  tiers: { minHoursBeforeDeparture: string; chargePercent: string }[];
  reason: string;
};
export type TiersFormValues = z.output<typeof tiersSchema>;

/** Field paths the API can name in `VALIDATION_ERROR` details. */
export const TIER_FIELDS = [
  "reason",
  "tiers",
  ...Array.from({ length: MAX_TIERS }, (_, i) => [
    `tiers.${i}.minHoursBeforeDeparture` as const,
    `tiers.${i}.chargePercent` as const,
  ]).flat(),
] as const;
