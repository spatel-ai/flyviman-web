import type { Schemas } from "@/lib/api/types";

type EmptyLegStatus = Schemas["EmptyLegStatus"];

function time(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Orders two departures soonest first. A missing or unreadable departure goes
 * last, in either direction, so it never hides a dated row.
 */
export function compareDeparture(
  a: string | null | undefined,
  b: string | null | undefined,
  direction: "soonest" | "latest" = "soonest",
): number {
  const left = time(a);
  const right = time(b);
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return direction === "soonest" ? left - right : right - left;
}

/** A sorted copy; equal departures keep the order the API gave. */
export function sortByDeparture<T>(
  items: readonly T[],
  departure: (item: T) => string | null | undefined,
  direction: "soonest" | "latest" = "soonest",
): T[] {
  return [...items].sort((a, b) =>
    compareDeparture(departure(a), departure(b), direction),
  );
}

const OFFER_RANK: Record<EmptyLegStatus, number> = {
  PUBLISHED: 0,
  PENDING_REVIEW: 1,
  DRAFT: 2,
  BOOKED: 3,
  WITHDRAWN: 4,
  EXPIRED: 4,
};

/** Live offers first, then the ones still being prepared, then closed ones; each group by departure. */
export function sortOffers<
  T extends { status: string; departureFrom: string | null },
>(items: readonly T[]): T[] {
  const rank = (status: string) =>
    OFFER_RANK[status as EmptyLegStatus] ?? OFFER_RANK.EXPIRED;
  return [...items].sort(
    (a, b) =>
      rank(a.status) - rank(b.status) ||
      compareDeparture(a.departureFrom, b.departureFrom),
  );
}
