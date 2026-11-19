import type { Schemas } from "@/lib/api/types";

/**
 * The API returns null before, after and reason for pricing rule records when
 * the caller's role may not read them (D-103). Pricing rule records always
 * carry at least one of the three otherwise, so all null means restricted.
 */
export function isRestricted(
  log: Pick<
    Schemas["AuditLogResponseDto"],
    "entityType" | "before" | "after" | "reason"
  >,
): boolean {
  return (
    log.entityType === "PricingRule" &&
    log.before == null &&
    log.after == null &&
    log.reason == null
  );
}
