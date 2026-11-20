import { z } from "zod";
import type { Schemas } from "@/lib/api/types";
import { formatMoney, rupeesToPaise } from "@/lib/format/money";
import { REASON_MAX, REASON_MIN } from "@/lib/pricing-rules";

export type Promotion = Schemas["PromotionResponseDto"];
export type CreatePromotionBody = Schemas["CreatePromotionDto"];

/** The API's code rule: letters, digits and inner dashes, 3–32 long. */
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,30}[A-Z0-9]$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const optionalCap = (max: number) =>
  z
    .string()
    .trim()
    .refine(
      (text) =>
        text === "" ||
        (/^\d+$/.test(text) && Number(text) >= 1 && Number(text) <= max),
      `Leave empty for no limit, or enter a whole number from 1 to ${max.toLocaleString("en-IN")}.`,
    );

export const promotionSchema = z
  .object({
    code: z
      .string()
      .trim()
      .transform((text) => text.toUpperCase())
      .refine(
        (text) => CODE_PATTERN.test(text),
        "Use 3 to 32 letters, digits or dashes (not at either end).",
      ),
    name: z
      .string()
      .trim()
      .min(2, "Enter a name of at least 2 characters.")
      .max(60, "At most 60 characters."),
    kind: z.enum(["PERCENT", "FIXED"]),
    value: z.string().trim().min(1, "Enter a value."),
    category: z.enum(["ALL", "PRIVATE_CHARTER", "HELICOPTER"]),
    originId: z.string(),
    destinationId: z.string(),
    startsOn: z.string().regex(DAY, "Choose a start date."),
    endsOn: z.string().regex(DAY, "Choose an end date."),
    maxUses: optionalCap(1_000_000),
    maxUsesPerCustomer: optionalCap(1000),
    reason: z
      .string()
      .trim()
      .min(REASON_MIN, `Say why, in at least ${REASON_MIN} characters.`)
      .max(REASON_MAX, `At most ${REASON_MAX} characters.`),
  })
  .superRefine((values, ctx) => {
    if (values.kind === "PERCENT") {
      const percent = Number(values.value);
      if (
        !/^\d{1,3}(\.\d{1,2})?$/.test(values.value) ||
        percent <= 0 ||
        percent > 100
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["value"],
          message:
            "Enter a percentage above 0 and at most 100, with up to two decimals.",
        });
      }
    } else {
      let paise: number | null = null;
      try {
        paise = rupeesToPaise(values.value);
      } catch {
        paise = null;
      }
      if (paise == null || paise < 100) {
        ctx.addIssue({
          code: "custom",
          path: ["value"],
          message:
            "Enter an amount in rupees, at least ₹1 and up to ₹10 crore.",
        });
      }
    }
    if (Boolean(values.originId) !== Boolean(values.destinationId)) {
      ctx.addIssue({
        code: "custom",
        path: ["destinationId"],
        message: "Choose both ends of the route, or neither.",
      });
    } else if (values.originId && values.originId === values.destinationId) {
      ctx.addIssue({
        code: "custom",
        path: ["destinationId"],
        message: "Choose two different places.",
      });
    }
    if (DAY.test(values.startsOn) && DAY.test(values.endsOn)) {
      if (values.endsOn < values.startsOn) {
        ctx.addIssue({
          code: "custom",
          path: ["endsOn"],
          message: "The last day is before the first.",
        });
      }
    }
  });

export type PromotionFormInput = z.input<typeof promotionSchema>;
export type PromotionFormValues = z.output<typeof promotionSchema>;

/** Form fields the API's field names map onto. */
export const PROMOTION_FIELDS = [
  "code",
  "name",
  "value",
  "originId",
  "destinationId",
  "startsOn",
  "endsOn",
  "maxUses",
  "maxUsesPerCustomer",
  "reason",
] as const;

export const PROMOTION_ALIASES = {
  percent: "value",
  amountMinor: "value",
  startsAt: "startsOn",
  endsAt: "endsOn",
} as const;

/**
 * The request body. Dates are whole days in India time: from the start of
 * the first day to the end of the last.
 */
export function toPromotionBody(
  values: PromotionFormValues,
): CreatePromotionBody {
  const lastDay = new Date(`${values.endsOn}T00:00:00+05:30`);
  lastDay.setUTCDate(lastDay.getUTCDate() + 1);
  return {
    code: values.code,
    name: values.name,
    kind: values.kind,
    ...(values.kind === "PERCENT"
      ? { percent: Number(values.value) }
      : { amountMinor: rupeesToPaise(values.value) ?? 0 }),
    currency: "INR",
    category: values.category === "ALL" ? null : values.category,
    originId: values.originId || null,
    destinationId: values.destinationId || null,
    startsAt: new Date(`${values.startsOn}T00:00:00+05:30`).toISOString(),
    endsAt: lastDay.toISOString(),
    maxUses: values.maxUses ? Number(values.maxUses) : null,
    maxUsesPerCustomer: values.maxUsesPerCustomer
      ? Number(values.maxUsesPerCustomer)
      : null,
    reason: values.reason,
  };
}

/** "10% off" or "₹500 off". */
export function describeOffer(promotion: Promotion): string {
  return promotion.kind === "PERCENT"
    ? `${promotion.percent ?? 0}% off`
    : `${formatMoney(promotion.amountMinor ?? 0, promotion.currency)} off`;
}

const CATEGORY_NAMES: Record<string, string> = {
  PRIVATE_CHARTER: "Charter",
  HELICOPTER: "Helicopter",
};

/** Where the code applies: category and route. */
export function describeScope(promotion: Promotion): string {
  const category = promotion.category
    ? (CATEGORY_NAMES[promotion.category] ?? promotion.category)
    : "Charter and helicopter";
  return promotion.originId
    ? `${category}, ${promotion.originName ?? "—"} ↔ ${promotion.destinationName ?? "—"}`
    : category;
}

/** "3 of 100 uses" or "3 uses". */
export function describeUses(promotion: Promotion): string {
  const total = promotion.maxUses
    ? `${promotion.uses} of ${promotion.maxUses} uses`
    : `${promotion.uses} use${promotion.uses === 1 ? "" : "s"}`;
  return promotion.maxUsesPerCustomer
    ? `${total}, ${promotion.maxUsesPerCustomer} per customer`
    : total;
}

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  ENDED: "Ended",
};

/** Unknown statuses from a newer API are shown as they are. */
export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
