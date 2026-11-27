import type { Schemas } from "@/lib/api/types";

/**
 * Flyviman's cancellation tiers (D-172), shared by the search result detail
 * and the admin form. A tier applies when the notice left is at least its
 * hours, so a boundary falls in the cheaper tier; the wording here matches
 * the API's summary (`pricing/cancellation-tiers.ts`).
 */

export type CancellationTier = Schemas["CancellationTierDto"];
export type CancellationTierTable = Schemas["CancellationTierTableDto"];

function hours(n: number): string {
  return n === 1 ? "1 hour" : `${n} hours`;
}

/** When each tier applies, in words, longest notice first. */
export function noticeLabel(
  tiers: readonly CancellationTier[],
  index: number,
): string {
  const tier = tiers[index];
  const longer = index > 0 ? tiers[index - 1].minHoursBeforeDeparture : null;
  if (tier.minHoursBeforeDeparture === 0) {
    return longer === null
      ? "Any time before departure, or a no-show"
      : `Under ${hours(longer)} before departure, or a no-show`;
  }
  return longer === null
    ? `${hours(tier.minHoursBeforeDeparture)} or more before departure`
    : `${hours(tier.minHoursBeforeDeparture)} to under ${hours(longer)} before departure`;
}

/** One line per tier: "72 hours or more before departure: 10% of the price". */
export function tierLines(tiers: readonly CancellationTier[]): string[] {
  return tiers.map(
    (tier, index) =>
      `${noticeLabel(tiers, index)}: ${tier.chargePercent}% of the price`,
  );
}

/**
 * The tier lines to list under a saved summary: none when the summary already
 * words every tier (the API writes the tiers into it, `tiersSummary`), so a
 * booking's terms are never shown twice in two wordings; otherwise every line,
 * in the same wording as the API.
 */
export function linesNotInSummary(
  summary: string,
  tiers: readonly CancellationTier[],
): string[] {
  const lines = tierLines(tiers);
  return lines.every((line) => summary.includes(line)) ? [] : lines;
}

export interface TermsParts {
  /** The words before the first tier. */
  intro: string;
  /** The tiers, in the API's wording, one per line. */
  lines: string[];
  /** The words after the last tier. */
  outro: string;
}

/**
 * A saved summary that words every tier, split so the tiers can be listed
 * (when: charge) instead of read as one run-on paragraph. The wording is the
 * summary's own; null when it does not word every tier in order.
 */
export function splitSummary(
  summary: string,
  tiers: readonly CancellationTier[],
): TermsParts | null {
  const lines = tierLines(tiers);
  if (lines.length === 0) return null;
  let cursor = 0;
  let start = -1;
  for (const line of lines) {
    const at = summary.indexOf(line, cursor);
    if (at < 0) return null;
    if (start < 0) start = at;
    cursor = at + line.length;
  }
  return {
    intro: summary.slice(0, start).trim(),
    lines,
    outro: summary
      .slice(cursor)
      .replace(/^[.\s]+/, "")
      .trim(),
  };
}
