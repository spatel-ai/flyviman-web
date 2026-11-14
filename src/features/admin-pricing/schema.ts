import { z } from "zod";
import { rupeesToPaise } from "@/lib/format/money";
import { RULE_META, type FieldDef, type RuleType } from "./rules";

export const REASON_MIN = 3;
export const REASON_MAX = 500;

const reason = z
  .string()
  .trim()
  .min(REASON_MIN, `Say why, in at least ${REASON_MIN} characters.`)
  .max(REASON_MAX, `At most ${REASON_MAX} characters.`);

function fieldSchema(field: FieldDef) {
  switch (field.kind) {
    case "number":
      return z
        .string()
        .trim()
        .min(1, "Enter a value.")
        .transform((text, ctx) => {
          const value = Number(text);
          if (!Number.isFinite(value)) {
            ctx.addIssue({ code: "custom", message: "Enter a number." });
            return z.NEVER;
          }
          if (value < field.min || value > field.max) {
            ctx.addIssue({
              code: "custom",
              message: `Enter a value from ${field.min} to ${field.max}.`,
            });
            return z.NEVER;
          }
          const scaled = value * 10 ** field.decimals;
          if (Math.abs(scaled - Math.round(scaled)) > 1e-9) {
            ctx.addIssue({
              code: "custom",
              message:
                field.decimals === 0
                  ? "Enter a whole number."
                  : `Use at most ${field.decimals} decimal places.`,
            });
            return z.NEVER;
          }
          return value;
        });
    case "rupees":
      return z
        .string()
        .trim()
        .min(1, "Enter an amount.")
        .transform((text, ctx) => {
          let paise: number | null = null;
          try {
            paise = rupeesToPaise(text);
          } catch {
            paise = null;
          }
          if (paise == null) {
            ctx.addIssue({
              code: "custom",
              message: "Enter an amount in rupees, up to two decimal places.",
            });
            return z.NEVER;
          }
          return paise;
        });
    case "text":
      return z
        .string()
        .trim()
        .min(2, "Enter at least 2 characters.")
        .max(40, "At most 40 characters.");
    case "choice":
      return z.enum(field.options.map((o) => o.value) as [string, ...string[]]);
  }
}

/** The form for one rule type: its settings (as typed) and a reason. */
export function ruleSchema(type: RuleType) {
  const shape: Record<string, ReturnType<typeof fieldSchema>> = {};
  for (const field of RULE_META[type].fields)
    shape[field.key] = fieldSchema(field);
  return z.object({ config: z.object(shape), reason });
}

export type RuleFormInput = {
  config: Record<string, string>;
  reason: string;
};

export type RuleFormValues = {
  config: Record<string, unknown>;
  reason: string;
};

/** Field paths the API can name in `VALIDATION_ERROR` details. */
export function fieldPaths(type: RuleType) {
  return [
    "reason",
    ...RULE_META[type].fields.map((field) => `config.${field.key}` as const),
  ] as const;
}
