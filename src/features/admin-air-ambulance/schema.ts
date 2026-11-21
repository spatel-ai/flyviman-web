import { z } from "zod";
import { rupeesToPaise } from "@/lib/format/money";

/** ₹2 crore in paise: the API's largest air ambulance quote. */
export const MAX_QUOTE_MINOR = 2_000_000_000;

function hasHiddenCharacter(text: string): boolean {
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code === 0x09 || code === 0x0a || code === 0x0d) continue;
    if (
      code < 0x20 ||
      code === 0x7f ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2066 && code <= 0x2069)
    ) {
      return true;
    }
  }
  return false;
}

/** Rupees as typed, as paise; null when not a valid quote amount. */
export function quoteAmountMinor(input: string): number | null {
  try {
    const paise = rupeesToPaise(input);
    return paise !== null && paise >= 1 && paise <= MAX_QUOTE_MINOR
      ? paise
      : null;
  } catch {
    return null;
  }
}

/** The quote form (`POST /admin/air-ambulance/requests/:reference/quote`). */
const quoteFields = z.object({
  operatorId: z.string().min(1, "Choose the operator."),
  amount: z.string().refine((value) => quoteAmountMinor(value) !== null, {
    message: "Enter an amount in rupees, up to ₹2 crore.",
  }),
  conditions: z
    .string()
    .trim()
    .min(1, "State the service and cancellation conditions.")
    .max(2000, "Keep the conditions under 2,000 characters.")
    .refine((value) => !hasHiddenCharacter(value), {
      message: "Remove hidden formatting characters from this text.",
    }),
});

export const quoteSchema = quoteFields.extend({
  revisionReason: z
    .string()
    .trim()
    .max(500, "Keep the reason under 500 characters.")
    .refine((v) => !hasHiddenCharacter(v), {
      message: "Remove hidden formatting characters from this text.",
    })
    .optional(),
});

/** A re-quote (the request is already QUOTED) also needs a reason. */
export const requoteSchema = quoteSchema.extend({
  revisionReason: z
    .string()
    .trim()
    .min(3, "Say why the quote is being replaced.")
    .max(500, "Keep the reason under 500 characters.")
    .refine((v) => !hasHiddenCharacter(v), {
      message: "Remove hidden formatting characters from this text.",
    }),
});

export type QuoteValues = z.input<typeof quoteSchema>;
export type QuoteOutput = z.output<typeof quoteSchema>;
