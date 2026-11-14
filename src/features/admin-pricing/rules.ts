import type { AircraftCategory, Schemas } from "@/lib/api/types";
import { formatMoney, paiseToRupees } from "@/lib/format/money";

export type PricingRule = Schemas["PricingRuleResponseDto"];
export type RuleType = Schemas["CreatePricingRuleDto"]["type"];
export type RuleScope = Schemas["CreatePricingRuleDto"]["scope"];

/**
 * How each setting is entered. Bounds mirror the API's
 * (`admin-rule-config.ts`), so most mistakes are caught before sending; the
 * API remains the judge.
 */
export type FieldDef =
  | {
      key: string;
      label: string;
      kind: "number";
      min: number;
      max: number;
      decimals: number;
      hint?: string;
    }
  | { key: string; label: string; kind: "rupees"; hint?: string }
  | { key: string; label: string; kind: "text"; hint?: string }
  | {
      key: string;
      label: string;
      kind: "choice";
      options: { value: string; label: string }[];
      hint?: string;
    };

export interface RuleMeta {
  label: string;
  /** One line saying what the rule does to a price. */
  description: string;
  fields: FieldDef[];
}

export const COMMISSION_MODES = [
  { value: "ADD_ON", label: "Added on top of the operator's price" },
  { value: "DEDUCTED", label: "Deducted from the operator's price" },
];

export const RULE_META: Record<RuleType, RuleMeta> = {
  COMMISSION: {
    label: "Commission",
    description: "Flyviman's share of each charter price.",
    fields: [
      {
        key: "percent",
        label: "Commission (%)",
        kind: "number",
        min: 0,
        max: 50,
        decimals: 2,
        hint: "0 to 50.",
      },
      {
        key: "mode",
        label: "How it is charged",
        kind: "choice",
        options: COMMISSION_MODES,
      },
    ],
  },
  TAX: {
    label: "Tax",
    description: "Tax added to the operator's price and Flyviman's fee.",
    fields: [
      {
        key: "name",
        label: "Name shown to customers",
        kind: "text",
        hint: "For example GST.",
      },
      {
        key: "percent",
        label: "Rate (%)",
        kind: "number",
        min: 0,
        max: 40,
        decimals: 2,
        hint: "0 to 40.",
      },
    ],
  },
  MIN_CHARGE: {
    label: "Minimum charge",
    description: "The lowest operator subtotal a trip is priced at.",
    fields: [{ key: "amountMinor", label: "Minimum (₹)", kind: "rupees" }],
  },
  ROUTING_FACTOR: {
    label: "Routing factor",
    description: "Stretches the straight-line distance to allow for airways.",
    fields: [
      {
        key: "factor",
        label: "Factor",
        kind: "number",
        min: 1,
        max: 1.5,
        decimals: 3,
        hint: "1 to 1.5. 1.08 adds 8% to the distance.",
      },
    ],
  },
  TIME_ALLOWANCE: {
    label: "Taxi and procedure time",
    description: "Minutes added to every leg for taxi, departure and arrival.",
    fields: [
      {
        key: "minutes",
        label: "Minutes per leg",
        kind: "number",
        min: 0,
        max: 120,
        decimals: 0,
      },
    ],
  },
  VALIDITY: {
    label: "Estimate validity",
    description: "How long an estimate holds before it must be recalculated.",
    fields: [
      {
        key: "minutes",
        label: "Minutes",
        kind: "number",
        min: 5,
        max: 10_080,
        decimals: 0,
        hint: "5 minutes to 7 days.",
      },
    ],
  },
  MIN_BILLABLE_HOURS: {
    label: "Minimum billable hours",
    description: "Default for operators who have not set their own.",
    fields: [
      {
        key: "hours",
        label: "Hours per flight",
        kind: "number",
        min: 0.5,
        max: 12,
        decimals: 2,
      },
    ],
  },
  POSITIONING: {
    label: "Positioning",
    description: "Default for flying an aircraft to and from its base.",
    fields: [
      {
        key: "rateFactor",
        label: "Share of the hourly rate",
        kind: "number",
        min: 0,
        max: 2,
        decimals: 2,
        hint: "0.8 charges positioning at 80% of the hourly rate.",
      },
      {
        key: "freeWithinKm",
        label: "Free within (km)",
        kind: "number",
        min: 0,
        max: 1000,
        decimals: 0,
      },
    ],
  },
};

export const RULE_TYPES = Object.keys(RULE_META) as RuleType[];

export const RULE_TYPE_OPTIONS = RULE_TYPES.map((type) => ({
  value: type,
  label: RULE_META[type].label,
}));

export const CATEGORY_LABELS: Record<AircraftCategory, string> = {
  TURBOPROP: "Turboprop",
  LIGHT_JET: "Light jet",
  MIDSIZE_JET: "Midsize jet",
  HEAVY_JET: "Heavy jet",
  HELICOPTER: "Helicopter",
  AIR_AMBULANCE_FIXED: "Air ambulance (fixed wing)",
  AIR_AMBULANCE_ROTARY: "Air ambulance (rotary)",
};

export const CATEGORY_OPTIONS = (
  Object.entries(CATEGORY_LABELS) as [AircraftCategory, string][]
).map(([value, label]) => ({ value, label }));

/** Operator-owned types, seen here only in a calculation's applied rules. */
const OPERATOR_TYPE_LABELS: Record<string, string> = {
  HOURLY_RATE: "Hourly rate",
  LANDING: "Landing charge",
  HANDLING: "Handling charge",
};

export function ruleLabel(type: string): string {
  return (
    RULE_META[type as RuleType]?.label ?? OPERATOR_TYPE_LABELS[type] ?? type
  );
}

/** "All aircraft" for a platform rule, the category's name otherwise. */
export function appliesTo(
  rule: Pick<PricingRule, "scope" | "scopeRef">,
): string {
  if (rule.scope === "PLATFORM") return "All aircraft";
  return (
    CATEGORY_LABELS[rule.scopeRef as AircraftCategory] ?? rule.scopeRef ?? "—"
  );
}

function num(config: Record<string, unknown>, key: string): number | null {
  const value = config[key];
  return typeof value === "number" ? value : null;
}

/** A rule's settings in a few words: "10%, added on top", "GST 18%". */
export function describeConfig(
  type: string,
  config: Record<string, unknown>,
): string {
  switch (type) {
    case "COMMISSION":
      return `${num(config, "percent") ?? "?"}%, ${
        config.mode === "DEDUCTED"
          ? "deducted from the operator"
          : "added on top"
      }`;
    case "TAX":
      return `${String(config.name ?? "Tax")} ${num(config, "percent") ?? "?"}%`;
    case "MIN_CHARGE":
      return formatMoney(num(config, "amountMinor") ?? 0, "INR");
    case "ROUTING_FACTOR":
      return `× ${num(config, "factor") ?? "?"}`;
    case "TIME_ALLOWANCE":
      return `${num(config, "minutes") ?? "?"} min per leg`;
    case "VALIDITY":
      return `${num(config, "minutes") ?? "?"} min`;
    case "MIN_BILLABLE_HOURS":
      return `${num(config, "hours") ?? "?"} h`;
    case "POSITIONING":
      return `${num(config, "rateFactor") ?? "?"} × hourly rate, free within ${
        num(config, "freeWithinKm") ?? 0
      } km`;
    case "HOURLY_RATE":
      return `${formatMoney(num(config, "amountMinor") ?? 0, "INR")} an hour`;
    case "LANDING":
    case "HANDLING":
      return formatMoney(num(config, "amountMinor") ?? 0, "INR");
    default:
      return JSON.stringify(config);
  }
}

/** Stored settings as the form shows them (amounts in rupees). */
export function configToDraft(
  type: RuleType,
  config: Record<string, unknown> = {},
): Record<string, string> {
  const draft: Record<string, string> = {};
  for (const field of RULE_META[type].fields) {
    const value = config[field.key];
    if (field.kind === "rupees") {
      draft[field.key] = typeof value === "number" ? paiseToRupees(value) : "";
    } else if (field.kind === "choice") {
      draft[field.key] =
        typeof value === "string" ? value : field.options[0].value;
    } else {
      draft[field.key] = value == null ? "" : String(value);
    }
  }
  return draft;
}
