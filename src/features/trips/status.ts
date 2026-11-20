/** Statuses the API lists as in progress (requested up to scheduled). */
const IN_PROGRESS: ReadonlySet<string> = new Set([
  "REQUESTED",
  "OPERATOR_PENDING",
  "CLARIFICATION_REQUESTED",
  "PRICE_CONFIRMED",
  "AWAITING_PAYMENT",
  "CONFIRMED",
  "SCHEDULED",
]);

/** Changes and cancellation are offered only while a trip is in progress. An unknown status offers nothing. */
export function isInProgress(status: string): boolean {
  return IN_PROGRESS.has(status);
}
