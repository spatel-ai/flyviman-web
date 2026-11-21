"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AirAmbulanceStatusBadge } from "@/components/shared/air-ambulance/status";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { StatTile } from "@/components/shared/stat-tile";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";

type Trip = Schemas["TripSummaryDto"];
type AirAmbulance = Schemas["AirAmbulanceSummaryDto"];

/** Requests still waiting for the operator or for the customer's answer. */
const OPEN = ["REQUESTED", "OPERATOR_PENDING", "CLARIFICATION_REQUESTED"];
/** Air ambulance requests that are over. */
const CLOSED = ["COMPLETED", "DECLINED", "CANCELLED"];

function TripLink({
  trip,
  children,
}: {
  trip: Trip;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={`/account/trips/${trip.reference}`}
      className="flex flex-col gap-3 rounded-lg bg-surface p-4 transition-colors duration-150 ease-standard hover:bg-surface-raised md:flex-row md:items-center md:justify-between"
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-title">
          {trip.originName} to {trip.destinationName}
        </span>
        <span className="text-body-sm text-muted">
          {formatDateTime(trip.departureAt)} · {trip.reference}
        </span>
        <span className="mt-1 flex flex-wrap gap-2">
          <StatusBadge kind="booking" status={trip.status} />
          <StatusBadge kind="payment" status={trip.paymentStatus} />
        </span>
      </span>
      {children}
    </Link>
  );
}

function TripPrice({ trip }: { trip: Trip }) {
  return trip.price ? (
    <PriceLabel
      amountMinor={trip.price.amountMinor}
      currency={trip.price.currency}
      priceType={trip.price.priceType}
      variant="compact"
    />
  ) : (
    <span className="text-body-sm text-muted">Price on request</span>
  );
}

/**
 * The account home: what needs the customer's attention, from the trips and
 * air ambulance lists they already have (no separate summary route). Trips
 * are the first 50 in progress, newest first.
 */
export function AccountOverview() {
  const trips = useQuery({
    queryKey: queryKeys.tripsOverview,
    queryFn: async () =>
      (
        await apiFetch<Trip[]>("me/bookings", {
          query: { view: "upcoming", page: 1, pageSize: 50 },
        })
      ).data,
  });
  const ambulance = useQuery({
    queryKey: queryKeys.airAmbulanceRequests(1),
    queryFn: () =>
      apiFetch<AirAmbulance[]>("air-ambulance/requests", {
        query: { page: 1, pageSize: 20 },
      }),
  });

  if (trips.isError) {
    return (
      <LoadError
        what="your overview"
        error={trips.error}
        onRetry={() => void trips.refetch()}
      />
    );
  }
  if (trips.isPending) {
    return (
      <div role="status" aria-label="Loading your overview">
        <Skeleton className="h-40" />
      </div>
    );
  }

  const now = Date.now();
  const inProgress = trips.data;
  const awaitingPayment = inProgress.filter(
    (trip) => trip.status === "AWAITING_PAYMENT",
  );
  const quotesReady = inProgress.filter(
    (trip) => trip.status === "PRICE_CONFIRMED",
  );
  const open = inProgress.filter((trip) => OPEN.includes(trip.status));
  const next = inProgress
    .filter(
      (trip) =>
        (trip.status === "CONFIRMED" || trip.status === "SCHEDULED") &&
        Date.parse(trip.departureAt) >= now,
    )
    .sort((a, b) => Date.parse(a.departureAt) - Date.parse(b.departureAt))[0];
  const activeAmbulance = (ambulance.data?.data ?? []).filter(
    (request) => !CLOSED.includes(request.status),
  );

  if (
    inProgress.length === 0 &&
    !ambulance.isError &&
    !ambulance.isPending &&
    activeAmbulance.length === 0
  ) {
    return (
      <EmptyState
        title="Nothing in progress"
        description="Requests you send appear here while they are in progress."
        action={
          <Link href="/search" className={buttonClasses({})}>
            Search flights
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          href="/account/trips"
          label="Open requests"
          value={open.length}
          caption="Waiting for the operator"
        />
        <StatTile
          href="/account/trips"
          label="Quotes to answer"
          value={quotesReady.length}
          caption="Price confirmed, your answer needed"
        />
        <StatTile
          href="/account/trips"
          label="Payments due"
          value={awaitingPayment.length}
          caption="Awaiting your payment"
        />
      </div>

      <Card variant="raised">
        <h2 className="text-title">Next trip</h2>
        <div className="mt-4">
          {next ? (
            <TripLink trip={next}>
              <TripPrice trip={next} />
            </TripLink>
          ) : (
            <p className="text-muted">
              No confirmed trip is coming up. Confirmed trips appear here.
            </p>
          )}
        </div>
      </Card>

      {awaitingPayment.length > 0 ? (
        <Card variant="raised">
          <h2 className="text-title">Payments due</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {awaitingPayment.map((trip) => (
              <li key={trip.reference}>
                <TripLink trip={trip}>
                  <TripPrice trip={trip} />
                </TripLink>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card variant="raised">
        <h2 className="text-title">Air ambulance</h2>
        <div className="mt-4">
          {ambulance.isError ? (
            <LoadError
              what="your air ambulance requests"
              error={ambulance.error}
              onRetry={() => void ambulance.refetch()}
            />
          ) : ambulance.isPending ? (
            <Skeleton className="h-16" />
          ) : activeAmbulance.length === 0 ? (
            <p className="text-muted">
              No open air ambulance requests. For an immediate emergency, call
              112 or your local emergency services.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {activeAmbulance.map((request) => (
                <li key={request.reference}>
                  <Link
                    href={`/account/air-ambulance/${request.reference}`}
                    className="flex flex-col gap-2 rounded-lg bg-surface p-4 transition-colors duration-150 ease-standard hover:bg-surface-raised md:flex-row md:items-center md:justify-between"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="text-title">
                        {request.originName ?? "Origin"} to{" "}
                        {request.destinationName ?? "destination"}
                      </span>
                      <span className="text-body-sm text-muted">
                        {formatDateTime(request.preferredAt)} ·{" "}
                        {request.reference}
                      </span>
                    </span>
                    <AirAmbulanceStatusBadge status={request.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
