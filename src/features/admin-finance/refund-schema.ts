import { z } from "zod";
import { REASON_MIN_LENGTH } from "@/components/ui/dialog";
import { rupeesToPaise } from "@/lib/format/money";

/** The API's limit on a refund reason (`CreateRefundDto`). */
export const REASON_MAX_LENGTH = 500;

/**
 * The refund form: an amount in rupees (prefilled with what is due, never
 * more than the payment's refundable remainder) and a reason for the audit
 * trail (rule 6). Money leaves the form as integer paise.
 */
export function refundSchema(refundableMinor: number) {
  return z.object({
    amount: z.string().transform((value, ctx) => {
      let paise: number | null;
      try {
        paise = rupeesToPaise(value);
      } catch {
        paise = null;
      }
      if (paise === null || paise <= 0) {
        ctx.addIssue({ code: "custom", message: "Enter an amount in rupees." });
        return z.NEVER;
      }
      if (paise > refundableMinor) {
        ctx.addIssue({
          code: "custom",
          message: "This is more than is left to refund on the payment.",
        });
        return z.NEVER;
      }
      return paise;
    }),
    reason: z
      .string()
      .trim()
      .min(REASON_MIN_LENGTH, "Give a reason: it is kept in the audit record.")
      .max(
        REASON_MAX_LENGTH,
        `Keep the reason under ${REASON_MAX_LENGTH} characters.`,
      ),
  });
}

export type RefundFormInput = z.input<ReturnType<typeof refundSchema>>;
export type RefundFormValues = z.output<ReturnType<typeof refundSchema>>;

/** Form fields the API's validation details may name ("amountMinor" → "amount"). */
export const REFUND_FIELDS = ["amount", "reason"] as const;
export const REFUND_ALIASES = { amountMinor: "amount" } as const;
