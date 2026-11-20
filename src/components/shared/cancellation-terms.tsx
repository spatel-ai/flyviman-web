export interface CancellationTermsProps {
  /** The conditions in words, as shown before the customer commits. */
  summary: string;
  /** Longest notice first; empty when only the summary is known. */
  charges: readonly {
    minHoursBeforeDeparture: number;
    chargePercent: number;
  }[];
  className?: string;
}

function rule(charge: CancellationTermsProps["charges"][number]): string {
  const percent =
    charge.chargePercent === 0
      ? "no charge"
      : `${charge.chargePercent}% of the price`;
  return charge.minHoursBeforeDeparture > 0
    ? `${charge.minHoursBeforeDeparture} hours or more before departure: ${percent}`
    : `Any later cancellation: ${percent}`;
}

/**
 * Cancellation conditions (business rule 9), shown before a request is sent
 * or a quote is accepted. The one place that draws them, so a change to the
 * terms' shape is a change here.
 */
export function CancellationTerms({
  summary,
  charges,
  className,
}: CancellationTermsProps) {
  return (
    <section aria-label="Cancellation conditions" className={className}>
      <h3 className="text-title">Cancellation conditions</h3>
      <p className="mt-1 text-body-sm text-muted">{summary}</p>
      {charges.length > 0 ? (
        <ul className="mt-2 list-disc pl-5 text-body-sm text-muted">
          {charges.map((charge) => (
            <li key={charge.minHoursBeforeDeparture}>{rule(charge)}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
