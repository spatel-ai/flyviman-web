"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { StatTile } from "@/components/shared/stat-tile";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { sortByDeparture } from "@/lib/sort/departure-order";

type Dashboard = Schemas["OperatorDashboardResponseDto"];

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Counts for the operator's own aircraft; sections the user may not open are absent. */
export function OperatorDashboard() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.operatorDashboard,
    queryFn: async () => (await apiFetch<Dashboard>("operator/dashboard")).data,
  });

  if (isPending) {
    return (
      <div
        role="status"
        aria-label="Loading your dashboard"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }
  if (isError) {
    return (
      <LoadError
        what="your dashboard"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  const { requests, quotes, trips, fleet, emptyLegs, settlements } = data;
  if (!requests && !quotes && !trips && !fleet && !emptyLegs && !settlements) {
    return (
      <EmptyState
        title="Nothing to show here"
        description="Your administrator can give you permissions that open booking requests, the fleet or empty legs."
      />
    );
  }

  const documentIssues = fleet
    ? fleet.documentsExpired + fleet.documentsExpiring + fleet.documentsPending
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {requests ? (
          <StatTile
            href="/operator/requests"
            label="Requests awaiting your response"
            value={requests.open}
            caption={
              requests.open === 0
                ? "You are up to date"
                : "Answer before the hold lapses"
            }
          />
        ) : null}
        {quotes ? (
          <StatTile
            href="/operator/requests"
            label="Quotes sent"
            value={quotes.sent}
            caption={
              quotes.expiringSoon > 0
                ? `${plural(quotes.expiringSoon, "quote")} expiring within 48 hours`
                : "Waiting for the customer"
            }
          />
        ) : null}
        {trips ? (
          <StatTile
            href="/operator/requests"
            label="Trips in the next 14 days"
            value={trips.upcomingCount}
            caption="Confirmed bookings"
          />
        ) : null}
        {fleet ? (
          <StatTile
            href="/operator/aircraft"
            label="Approved aircraft"
            value={fleet.approved}
            caption={
              fleet.pendingReview > 0
                ? `${plural(fleet.pendingReview, "aircraft", "aircraft")} under review`
                : fleet.other > 0
                  ? `${fleet.other} not listed`
                  : undefined
            }
          />
        ) : null}
        {fleet ? (
          <StatTile
            href="/operator/aircraft"
            label="Aircraft documents needing attention"
            value={documentIssues}
            caption={
              documentIssues === 0
                ? "Nothing needs attention"
                : [
                    fleet.documentsExpired > 0
                      ? `${plural(fleet.documentsExpired, "document")} expired`
                      : null,
                    fleet.documentsExpiring > 0
                      ? `${plural(fleet.documentsExpiring, "document")} expiring within 30 days`
                      : null,
                    fleet.documentsPending > 0
                      ? `${plural(fleet.documentsPending, "document")} under review`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
            }
          />
        ) : null}
        {emptyLegs ? (
          <StatTile
            href="/operator/empty-legs"
            label="Live empty legs"
            value={emptyLegs.live}
            caption={
              emptyLegs.expiringSoon > 0
                ? `${plural(emptyLegs.expiringSoon, "offer")} expiring within 48 hours`
                : "Published and bookable"
            }
          />
        ) : null}
        {settlements ? (
          <StatTile
            href="/operator/settlements"
            label="Settlements due"
            value={settlements.dueCount}
            caption={
              <span className="flex flex-col gap-2">
                {settlements.amounts
                  .filter((amount) => amount.dueMinor > 0)
                  .map((amount) => (
                    <PriceLabel
                      key={amount.currency}
                      amountMinor={amount.dueMinor}
                      currency={amount.currency}
                      priceType="CONFIRMED"
                      variant="compact"
                      lead="Payable"
                      className="items-start"
                    />
                  ))}
                <span>
                  {settlements.paidCount === 0
                    ? "None paid in the last 30 days"
                    : `${plural(settlements.paidCount, "settlement")} paid in the last 30 days`}
                </span>
                {settlements.amounts
                  .filter((amount) => amount.paidMinor > 0)
                  .map((amount) => (
                    <PriceLabel
                      key={amount.currency}
                      amountMinor={amount.paidMinor}
                      currency={amount.currency}
                      priceType="CONFIRMED"
                      variant="compact"
                      lead="Paid"
                      className="items-start"
                    />
                  ))}
              </span>
            }
          />
        ) : null}
      </div>

      {trips ? (
        <Card variant="raised">
          <h2 className="text-title">Upcoming trips</h2>
          {trips.upcoming.length === 0 ? (
            <p className="mt-2 text-muted">
              No confirmed trips depart in the next 14 days.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {sortByDeparture(trips.upcoming, (trip) => trip.departureAt).map(
                (trip) => (
                  <li key={trip.reference}>
                    <Link
                      href={`/operator/requests/${trip.reference}`}
                      className="flex flex-col gap-2 rounded-lg bg-surface p-4 transition-colors duration-150 ease-standard hover:bg-surface-raised md:flex-row md:items-center md:justify-between"
                    >
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="text-title">
                          {trip.originName} to {trip.destinationName}
                        </span>
                        <span className="text-body-sm text-muted">
                          {formatDateTime(trip.departureAt)} · {trip.reference}
                        </span>
                      </span>
                      <span className="flex flex-wrap gap-2">
                        <StatusBadge kind="booking" status={trip.status} />
                        <StatusBadge
                          kind="payment"
                          status={trip.paymentStatus}
                        />
                      </span>
                    </Link>
                  </li>
                ),
              )}
            </ul>
          )}
        </Card>
      ) : null}
    </div>
  );
}
