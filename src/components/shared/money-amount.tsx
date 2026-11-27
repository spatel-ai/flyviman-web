import { formatMoney } from "@/lib/format/money";

/**
 * A payment, refund, payout, commission, tax or fee amount. These are not
 * prices, so they carry no price type: the row's own status says what they are.
 * A trip price always goes through `PriceLabel` instead.
 */
export function MoneyAmount({
  amountMinor,
  currency,
}: {
  amountMinor: number;
  currency: string;
}) {
  return (
    <span className="tabular-nums">{formatMoney(amountMinor, currency)}</span>
  );
}
