/**
 * Short Indian-style amounts for tight spaces such as calendar days:
 * 85,000 → "₹85K", 4,20,000 → "₹4.2L", 1,25,00,000 → "₹1.25Cr".
 * Full amounts are always shown with `formatMoney`; this is a preview.
 */
export function shortRupees(amountMinor: number): string {
  const rupees = amountMinor / 100;
  const trim = (value: number, digits: number) =>
    value.toFixed(digits).replace(/\.?0+$/, "");
  if (rupees >= 1_00_00_000) return `₹${trim(rupees / 1_00_00_000, 2)}Cr`;
  if (rupees >= 1_00_000) return `₹${trim(rupees / 1_00_000, 1)}L`;
  if (rupees >= 1_000) return `₹${trim(rupees / 1_000, 0)}K`;
  return `₹${Math.round(rupees)}`;
}

export interface CalendarDayInput {
  date: string;
  /** Today in India. */
  today: string;
  /** From the fare calendar, when loaded. */
  fare?: { availableCount: number; lowestMinor: number | null };
  /** Whether the calendar answer for this month has arrived. */
  loaded: boolean;
  cheapestMinor: number | null;
}

export type CalendarDayState =
  "past" | "unknown" | "none" | "available" | "cheapest";

/**
 * What a day in the fare calendar shows. Before a route is chosen (or the
 * answer arrives) every future day can be picked; after, a day without
 * aircraft is greyed but can still be picked (a search shows the nearest
 * days), and the month's cheapest day is marked.
 */
export function calendarDayState(input: CalendarDayInput): CalendarDayState {
  if (input.date < input.today) return "past";
  if (!input.loaded) return "unknown";
  if (!input.fare || input.fare.availableCount === 0) return "none";
  if (
    input.cheapestMinor != null &&
    input.fare.lowestMinor === input.cheapestMinor
  ) {
    return "cheapest";
  }
  return "available";
}
