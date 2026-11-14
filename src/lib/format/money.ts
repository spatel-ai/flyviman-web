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

/** ₹10 crore in paise: the most any pricing input takes (the API's ceiling). */
export const MAX_MINOR = 10_000_000_000;

/**
 * Rupees typed by a person ("1,80,000", "₹ 2500.50") as paise, or null when
 * the field is empty. Throws on anything else, and above ₹10 crore, so a form
 * can say so. Money is held as integer paise (CLAUDE.md, working conventions).
 */
export function rupeesToPaise(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, "");
  if (cleaned === "") return null;
  // At most 9 rupee digits: anything longer is over the ceiling anyway, and
  // a very long one would lose precision as a number.
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(cleaned)) {
    throw new TypeError(`Not an amount in rupees: ${input}`);
  }
  const [whole, fraction = ""] = cleaned.split(".");
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (paise > MAX_MINOR) {
    throw new RangeError(`Over ₹10 crore: ${input}`);
  }
  return paise;
}

/** Paise as a plain rupee figure for a form field ("180000", "2500.5"). */
export function paiseToRupees(amountMinor: number | null): string {
  if (amountMinor == null) return "";
  const whole = Math.floor(amountMinor / 100);
  const fraction = amountMinor % 100;
  return fraction === 0
    ? String(whole)
    : `${whole}.${String(fraction).padStart(2, "0").replace(/0$/, "")}`;
}
