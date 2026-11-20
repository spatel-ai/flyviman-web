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
