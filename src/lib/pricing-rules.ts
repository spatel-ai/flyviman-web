import type { AircraftCategory, Schemas } from "@/lib/api/types";
import { ApiError } from "@/lib/api/errors";

export type PricingRule = Schemas["PricingRuleResponseDto"];
export type RuleScope = Schemas["CreatePricingRuleDto"]["scope"];

/** Length bounds of the reason an admin gives for a pricing or limits change. */
export const REASON_MIN = 3;
export const REASON_MAX = 500;

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

/** "All aircraft" for a platform rule, the category's name otherwise. */
export function appliesTo(
  rule: Pick<PricingRule, "scope" | "scopeRef">,
): string {
  if (rule.scope === "PLATFORM") return "All aircraft";
  return (
    CATEGORY_LABELS[rule.scopeRef as AircraftCategory] ?? rule.scopeRef ?? "—"
  );
}

/**
 * Refusals that mean the list on screen is out of date: another admin
 * changed, added or ended a rule since it loaded. The list is refetched so
 * trying again works on the latest version (security review, web M1).
 */
const STALE_LIST_CODES: ReadonlySet<string> = new Set([
  "PRICING_RULE_NOT_CURRENT",
  "PRICING_RULE_EXISTS",
  "NOT_FOUND",
]);

export function listIsStale(error: unknown): boolean {
  return error instanceof ApiError && STALE_LIST_CODES.has(error.code);
}
