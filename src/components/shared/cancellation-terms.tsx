import { linesNotInSummary } from "@/lib/cancellation-tiers";

export interface CancellationTermsProps {
  /** The conditions in words, as shown before the customer commits. */
  summary: string;
  /** Longest notice first; empty when only the summary is known. */
  charges: readonly {
    minHoursBeforeDeparture: number;
    chargePercent: number;
  }[];
  /**
   * The heading's level. 3 (the default) sits under a section heading or a
   * dialog title; 2 where the terms are a section of their own under the
   * page title.
   */
  headingLevel?: 2 | 3;
  className?: string;
}

/**
 * Cancellation conditions (business rule 9), shown before a request is sent
 * or a quote is accepted. The one place that draws them, so a change to the
 * terms' shape is a change here.
 */
export function CancellationTerms({
  summary,
  charges,
  headingLevel = 3,
  className,
}: CancellationTermsProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  // The saved summary is the wording the customer agreed to (rule 9); the
  // tiers are listed only when it does not already say them.
  const lines = linesNotInSummary(summary, charges);
  return (
    <section aria-label="Cancellation conditions" className={className}>
      <Heading className="text-title">Cancellation conditions</Heading>
      <p className="mt-1 text-body-sm text-muted">{summary}</p>
      {lines.length > 0 ? (
        <ul className="mt-2 list-disc pl-5 text-body-sm text-muted">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
