import { linesNotInSummary, splitSummary } from "@/lib/cancellation-tiers";

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
  // The saved summary is the wording the customer agreed to (rule 9). When it
  // words every tier, it is split around them so they read as a list; when it
  // does not, the tiers are listed under it.
  const parts = splitSummary(summary, charges);
  const lines = parts ? parts.lines : linesNotInSummary(summary, charges);
  return (
    <section aria-label="Cancellation conditions" className={className}>
      <Heading className="text-title">Cancellation conditions</Heading>
      {parts ? (
        parts.intro ? (
          <p className="mt-1 text-body-sm text-muted">{parts.intro}</p>
        ) : null
      ) : (
        <p className="mt-1 text-body-sm text-muted">{summary}</p>
      )}
      {lines.length > 0 ? (
        <ul className="mt-2 list-disc pl-5 text-body-sm text-muted">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {parts?.outro ? (
        <p className="mt-2 text-body-sm text-muted">{parts.outro}</p>
      ) : null}
    </section>
  );
}
