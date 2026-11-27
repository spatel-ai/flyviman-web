/** "2 passengers, 1 named" when the party size and the names differ; null when they match. */
export function passengerCountText(
  count: number,
  named: number,
): string | null {
  if (count === named) return null;
  const people = `${count} passenger${count === 1 ? "" : "s"}`;
  return `${people}, ${named} named`;
}

/** Said before sending, while fewer people are chosen than seats were asked for. */
export function fewerNamedWarning(seats: number, named: number): string | null {
  if (named === 0 || named >= seats) return null;
  return `${seats} seats requested, ${named} passenger${named === 1 ? "" : "s"} named. You can add the rest later from the trip page.`;
}
