const LOCALES: Record<string, string> = {
  INR: "en-IN",
};

/**
 * Formats an amount held in minor units (paise for INR) for display.
 * Whole amounts are shown without decimals: 52179600 INR -> "₹5,21,796".
 */
export function formatMoney(amountMinor: number, currency: string): string {
  if (!Number.isInteger(amountMinor)) {
    throw new TypeError("Money amounts must be whole minor units.");
  }

  const fractionDigits =
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  const divisor = 10 ** fractionDigits;
  const isWhole = amountMinor % divisor === 0;

  return new Intl.NumberFormat(LOCALES[currency] ?? "en", {
    style: "currency",
    currency,
    minimumFractionDigits: isWhole ? 0 : fractionDigits,
    maximumFractionDigits: isWhole ? 0 : fractionDigits,
  }).format(amountMinor / divisor);
}
