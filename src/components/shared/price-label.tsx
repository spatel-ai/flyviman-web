import { Badge, type Tone } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";

export type PriceType = "ESTIMATE" | "LIVE_FARE" | "QUOTE" | "CONFIRMED";

const PRESENTATION: Record<
  PriceType,
  { label: string; tone: Tone; note: string }
> = {
  ESTIMATE: {
    label: "Estimate",
    tone: "warning",
    note: "Final price confirmed by the operator",
  },
  LIVE_FARE: {
    label: "Live fare",
    tone: "accent",
    note: "Rechecked before payment",
  },
  QUOTE: { label: "Quote", tone: "info", note: "Quoted by the operator" },
  CONFIRMED: {
    label: "Confirmed price",
    tone: "success",
    note: "Includes taxes and fees",
  },
};

export interface PriceLabelProps {
  amountMinor: number;
  currency: string;
  /** Required: a price is never shown without saying what kind it is. */
  priceType: PriceType;
  /** UTC timestamp after which the price no longer holds. */
  validUntil?: string;
  /** Set by the caller once `validUntil` has passed. */
  expired?: boolean;
  /** Replaces the price type's standard note, for a price that is not a
   *  flight (a course fee). The type's badge always stays. */
  note?: string;
  /** `compact`: badge and amount on one line, no note, for a card where the
   *  full label does not fit (a popular route over a photo). `lead` goes
   *  before the amount ("from"). The badge always stays. */
  variant?: "default" | "compact";
  lead?: string;
  className?: string;
}

/**
 * The only way a price is shown (business rule: an estimate is never
 * presented as a final price). See docs/frontend/design-system.md.
 */
export function PriceLabel({
  amountMinor,
  currency,
  priceType,
  validUntil,
  expired = false,
  note: noteOverride,
  variant = "default",
  lead,
  className,
}: PriceLabelProps) {
  const presentation = PRESENTATION[priceType];
  const { label, tone } = presentation;
  const note = noteOverride ?? presentation.note;

  if (variant === "compact") {
    return (
      <span className={cn("flex flex-col items-end gap-1", className)}>
        <Badge tone={expired ? "neutral" : tone}>{label}</Badge>
        <span
          className={cn(
            "text-title tabular-nums",
            expired && "text-muted line-through",
          )}
        >
          {lead ? `${lead} ` : null}
          {formatMoney(amountMinor, currency)}
        </span>
      </span>
    );
  }

  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <Badge tone={expired ? "neutral" : tone}>{label}</Badge>
      <p
        className={cn(
          "text-h3 tabular-nums",
          expired && "text-muted line-through",
        )}
      >
        {formatMoney(amountMinor, currency)}
      </p>
      <p className="text-caption text-muted">
        {expired
          ? "This price has expired. Refresh to see the current price."
          : validUntil
            ? `${note} · Valid until ${formatDateTime(validUntil)}`
            : note}
      </p>
    </div>
  );
}
