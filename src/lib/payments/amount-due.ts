/**
 * Whether the gateway's verified notice (never the browser) has moved the
 * booking's payment summary on since the customer pressed Pay. A balance
 * payer starts at `PARTIALLY_PAID`, so the starting status is compared, not
 * `UNPAID`.
 */
export function paymentSettled(
  paymentStatus: string,
  startedFrom: string,
): boolean {
  return paymentStatus !== startedFrom;
}

/** How the amount due reads, by its kind; an unknown kind reads as due. */
export function amountDueTitle(kind: string): string {
  switch (kind) {
    case "DEPOSIT":
      return "Deposit due now";
    case "BALANCE":
      return "Balance due now";
    default:
      return "Amount due now";
  }
}
