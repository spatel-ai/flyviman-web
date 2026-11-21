import type { Schemas } from "@/lib/api/types";

/**
 * The API nulls before, after and reason for finance records (pricing rules,
 * promotions, payments, refunds, settlements) when the caller's role may not
 * read them, and flags the row `restricted`. A genuine record carries at least
 * one of the three, so a flagged row with all three null is withheld whole.
 */
export function isRestricted(
  log: Pick<
    Schemas["AuditLogResponseDto"],
    "restricted" | "before" | "after" | "reason"
  >,
): boolean {
  return (
    log.restricted &&
    log.before == null &&
    log.after == null &&
    log.reason == null
  );
}
