import { z } from "zod";
import type { Schemas } from "@/lib/api/types";

export type CategoryConfig = Schemas["CategoryConfigResponseDto"];
export type CategoryConfigChange = Schemas["UpdateCategoryConfigDto"];
type ServiceCategory = Schemas["ServiceCategory"];
type BookingMode = Schemas["BookingMode"];
type PaymentModel = Schemas["PaymentModel"];

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  SCHEDULED_AIRLINE: "Scheduled flights",
  PRIVATE_CHARTER: "Private charter",
  HELICOPTER: "Helicopter",
  EMPTY_LEG: "Empty legs",
  AIR_AMBULANCE: "Air ambulance",
};

const BOOKING_MODE_LABELS: Record<BookingMode, string> = {
  INSTANT: "Instant",
  REQUEST: "On request",
};

const PAYMENT_MODEL_LABELS: Record<PaymentModel, string> = {
  A_INSTANT: "A: full payment at booking",
  B_OPERATOR_CONFIRMED: "B: full payment after the operator confirms",
  C_DEPOSIT: "C: deposit, balance later",
};

/** A label for a value, or the value itself when the API sends a new one. */
function label<K extends string>(map: Record<K, string>, value: string) {
  return Object.hasOwn(map, value) ? map[value as K] : value;
}

export const categoryLabel = (value: string) => label(CATEGORY_LABELS, value);
export const bookingModeLabel = (value: string) =>
  label(BOOKING_MODE_LABELS, value);
export const paymentModelLabel = (value: string) =>
  label(PAYMENT_MODEL_LABELS, value);

const BOOKING_MODES = Object.keys(BOOKING_MODE_LABELS) as BookingMode[];
const PAYMENT_MODELS = Object.keys(PAYMENT_MODEL_LABELS) as PaymentModel[];

/** Air ambulance is always on request (rule 7); the API refuses INSTANT. */
export function bookingModeOptions(category: string) {
  return BOOKING_MODES.filter(
    (mode) => category !== "AIR_AMBULANCE" || mode !== "INSTANT",
  ).map((mode) => ({ value: mode, label: BOOKING_MODE_LABELS[mode] }));
}

export const PAYMENT_MODEL_OPTIONS = PAYMENT_MODELS.map((model) => ({
  value: model,
  label: PAYMENT_MODEL_LABELS[model],
}));

/** The API's limits (`UpdateCategoryConfigDto`). */
export const DEPOSIT_MIN = 1;
export const DEPOSIT_MAX = 100;
export const REASON_MIN = 3;
export const REASON_MAX = 500;

export const categoryConfigSchema = z.object({
  isEnabled: z.boolean(),
  bookingMode: z.enum(BOOKING_MODES, "Choose how it is booked."),
  paymentModel: z.enum(PAYMENT_MODELS, "Choose a payment model."),
  depositPercent: z
    .string()
    .trim()
    .regex(/^\d+$/, "Enter a whole percent.")
    .transform(Number)
    .refine(
      (value) => value >= DEPOSIT_MIN && value <= DEPOSIT_MAX,
      `Enter a percent from ${DEPOSIT_MIN} to ${DEPOSIT_MAX}.`,
    ),
  reason: z
    .string()
    .trim()
    .min(REASON_MIN, `Give a reason of at least ${REASON_MIN} characters.`)
    .max(REASON_MAX, `Use at most ${REASON_MAX} characters.`),
});

export type CategoryConfigInput = z.input<typeof categoryConfigSchema>;
export type CategoryConfigValues = z.output<typeof categoryConfigSchema>;

/** The form's starting values for a row. Unknown enum values start empty. */
export function formDefaults(row: CategoryConfig): CategoryConfigInput {
  return {
    isEnabled: row.isEnabled,
    bookingMode: (BOOKING_MODES as string[]).includes(row.bookingMode)
      ? row.bookingMode
      : ("" as BookingMode),
    paymentModel: (PAYMENT_MODELS as string[]).includes(row.paymentModel)
      ? row.paymentModel
      : ("" as PaymentModel),
    depositPercent: String(row.depositPercent),
    reason: "",
  };
}

/**
 * The PATCH body: only the fields that differ from the row, the row's
 * `updatedAt` (so a change made meanwhile is refused) and the reason.
 * `null` when nothing differs.
 */
export function changeBody(
  row: CategoryConfig,
  values: CategoryConfigValues,
): CategoryConfigChange | null {
  const body: CategoryConfigChange = {
    expectedUpdatedAt: row.updatedAt,
    reason: values.reason,
  };
  if (values.isEnabled !== row.isEnabled) body.isEnabled = values.isEnabled;
  if (values.bookingMode !== row.bookingMode) {
    body.bookingMode = values.bookingMode;
  }
  if (values.paymentModel !== row.paymentModel) {
    body.paymentModel = values.paymentModel;
  }
  if (values.depositPercent !== row.depositPercent) {
    body.depositPercent = values.depositPercent;
  }
  return Object.keys(body).length > 2 ? body : null;
}

/** Whether the change switches the category off (asks for confirmation). */
export function isDisabling(row: CategoryConfig, values: CategoryConfigValues) {
  return row.isEnabled && !values.isEnabled;
}
