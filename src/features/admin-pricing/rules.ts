import type { Schemas } from "@/lib/api/types";
import type { PricingRule } from "@/lib/pricing-rules";
import { formatMoney, paiseToRupees } from "@/lib/format/money";

export type RuleType = Schemas["CreatePricingRuleDto"]["type"];

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

export const MINIMUM_PER = [
  { value: "LEG", label: "Per flight" },
  { value: "DAY", label: "Per day" },
];

/** Platform rules finance can end; the API refuses the others (PRICING_RULE_REQUIRED). */
const OPTIONAL_PLATFORM_TYPES: ReadonlySet<string> = new Set([
  "MARKUP",
  "SERVICE_FEE",
  "DISCOUNT",
]);

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
      {
        key: "per",
        label: "The minimum applies",
        kind: "choice",
        options: MINIMUM_PER,
        hint: "Per day: the flights of a day together bill at least the minimum.",
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
  MARKUP: {
    label: "Markup",
    description:
      "Flyviman's markup, a percentage of the operator's price. Customers see it inside the flying charge, never as its own line.",
    fields: [
      {
        key: "percent",
        label: "Markup (%)",
        kind: "number",
        min: 0,
        max: 50,
        decimals: 2,
        hint: "0 to 50.",
      },
    ],
  },
  SERVICE_FEE: {
    label: "Service fee",
    description:
      "A fee per trip, shown to customers on its own line. It is not part of the operator's payable.",
    fields: [{ key: "amountMinor", label: "Fee per trip (₹)", kind: "rupees" }],
  },
  DISCOUNT: {
    label: "Discount",
    description:
      "A promotion funded by Flyviman: a percentage of the price before tax, never more than Flyviman earns on the trip, so the operator's payable does not change.",
    fields: [
      {
        key: "name",
        label: "Name shown to customers",
        kind: "text",
        hint: "For example Winter offer.",
      },
      {
        key: "percent",
        label: "Discount (%)",
        kind: "number",
        min: 0,
        max: 50,
        decimals: 2,
        hint: "0 to 50.",
      },
    ],
  },
  MATCHING_LIMITS: {
    label: "Matching limits",
    description: "Which trips an aircraft is offered for. Not managed here.",
    fields: [],
  },
};

/** Rule types this screen has a form for; a type with no fields has none. */
export const RULE_TYPES = (Object.keys(RULE_META) as RuleType[]).filter(
  (type) => RULE_META[type].fields.length > 0,
);

export const RULE_TYPE_OPTIONS = RULE_TYPES.map((type) => ({
  value: type,
  label: RULE_META[type].label,
}));

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
      return formatMoney(num(config, "amountMinor") ?? 0, "INR", {
        dropZeroDecimals: true,
      });
    case "ROUTING_FACTOR":
      return `× ${num(config, "factor") ?? "?"}`;
    case "TIME_ALLOWANCE":
      return `${num(config, "minutes") ?? "?"} min per leg`;
    case "VALIDITY":
      return `${num(config, "minutes") ?? "?"} min`;
    case "MIN_BILLABLE_HOURS":
      return `${num(config, "hours") ?? "?"} h${config.per === "DAY" ? " per day" : ""}`;
    case "MARKUP":
      return `${num(config, "percent") ?? "?"}% of the operator's price`;
    case "SERVICE_FEE":
      return `${formatMoney(num(config, "amountMinor") ?? 0, "INR", { dropZeroDecimals: true })} per trip`;
    case "DISCOUNT":
      return `${String(config.name ?? "Discount")} ${num(config, "percent") ?? "?"}% off`;
    case "POSITIONING":
      return `${num(config, "rateFactor") ?? "?"} × hourly rate, free within ${
        num(config, "freeWithinKm") ?? 0
      } km`;
    case "HOURLY_RATE":
      return `${formatMoney(num(config, "amountMinor") ?? 0, "INR", { dropZeroDecimals: true })} an hour`;
    case "LANDING":
    case "HANDLING":
      return formatMoney(num(config, "amountMinor") ?? 0, "INR", {
        dropZeroDecimals: true,
      });
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

/** A rule type this screen has a form for. */
export function isRuleType(type: string): type is RuleType {
  return (
    Object.hasOwn(RULE_META, type) &&
    RULE_META[type as RuleType].fields.length > 0
  );
}

/**
 * Whether Change (and, for a category rule, End) is offered. The API says
 * which rules finance may manage (`editable`); the screen also needs a form
 * for the type, so a rule type added to the API later is listed but never
 * opened in a form that does not know it (security review, web M2).
 */
export function canManage(
  rule: Pick<PricingRule, "type" | "editable">,
): boolean {
  return rule.editable && isRuleType(rule.type);
}

/**
 * Whether End is offered: a category rule (the platform rule then applies),
 * or a platform markup, service fee or discount, which prices can do
 * without. Other platform rules are changed, never ended.
 */
export function canEnd(
  rule: Pick<PricingRule, "type" | "scope" | "editable">,
): boolean {
  return (
    canManage(rule) &&
    (rule.scope === "CATEGORY" || OPTIONAL_PLATFORM_TYPES.has(rule.type))
  );
}

/**
 * The settings as the API takes them. Per flight is the default of
 * `per`, so it is left out: an unchanged rule then stays equal to its
 * stored version and a save writes nothing.
 */
export function configForApi(
  type: RuleType,
  config: Record<string, unknown>,
): Record<string, unknown> {
  if (type === "MIN_BILLABLE_HOURS" && config.per === "LEG") {
    return Object.fromEntries(
      Object.entries(config).filter(([key]) => key !== "per"),
    );
  }
  return config;
}
