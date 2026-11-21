import { z } from "zod";
import { REASON_MIN_LENGTH } from "@/components/ui/dialog";
import { REASON_MAX_LENGTH } from "./refund-schema";

/** What finance may do with a settlement in each status (the API's moves). */
export const SETTLEMENT_ACTIONS: Record<
  string,
  { value: "DUE" | "PAID" | "ON_HOLD"; label: string }[]
> = {
  NOT_DUE: [{ value: "ON_HOLD", label: "Put on hold" }],
  DUE: [
    { value: "PAID", label: "Mark paid" },
    { value: "ON_HOLD", label: "Put on hold" },
  ],
  ON_HOLD: [{ value: "DUE", label: "Release the hold" }],
  PAID: [],
};

/** The API's pattern for a payout's bank reference (`UpdateSettlementDto`). */
const PAYOUT_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9 ._/-]*$/;

/**
 * A settlement change: the new status, a reason for the audit trail (rule
 * 6) and, to mark it paid, the bank transfer reference of the payout.
 */
export const settlementSchema = z
  .object({
    status: z.enum(["DUE", "PAID", "ON_HOLD"]),
    reason: z
      .string()
      .trim()
      .min(REASON_MIN_LENGTH, "Give a reason: it is kept in the audit record.")
      .max(
        REASON_MAX_LENGTH,
        `Keep the reason under ${REASON_MAX_LENGTH} characters.`,
      ),
    paymentReference: z.string().trim(),
  })
  .superRefine((value, ctx) => {
    if (value.status !== "PAID") return;
    if (
      value.paymentReference.length < 3 ||
      value.paymentReference.length > 64 ||
      !PAYOUT_REFERENCE.test(value.paymentReference)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["paymentReference"],
        message:
          "Enter the bank transfer reference: 3 to 64 letters, digits, spaces, dots, dashes or slashes.",
      });
    }
  });

export type SettlementFormInput = z.input<typeof settlementSchema>;
export type SettlementFormValues = z.output<typeof settlementSchema>;

export const SETTLEMENT_FIELDS = [
  "status",
  "reason",
  "paymentReference",
] as const;
