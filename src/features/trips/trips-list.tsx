"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonClasses } from "@/components/ui/button-classes";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";

type Trip = Schemas["TripSummaryDto"];
type View = "upcoming" | "past";
const PAGE_SIZE = 10;

export function TripsList() {
  const [view, setView] = useState<View>("upcoming");
  const [page, setPage] = useState(1);

  const trips = useQuery({
    queryKey: queryKeys.trips(view, page),
    queryFn: async () => {
      const { data, meta } = await apiFetch<Trip[]>("me/bookings", {
        query: { view, page, pageSize: PAGE_SIZE },
      });
      return { items: data, total: meta.total ?? data.length };
    },
  });

  return (
    <Tabs
      value={view}
      onValueChange={(next) => {
        setView(next as View);
        setPage(1);
      }}
    >
      <TabsList aria-label="Trips">
        <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        <TabsTrigger value="past">Past</TabsTrigger>
      </TabsList>
      <TabsContent value={view} className="mt-6 flex flex-col gap-4">
        {trips.isPending ? (
          <div
            role="status"
            aria-label="Loading your trips"
            className="flex flex-col gap-3"
          >
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : trips.isError ? (
          <LoadError
            what="your trips"
            error={trips.error}
            onRetry={() => void trips.refetch()}
          />
        ) : trips.data.items.length === 0 ? (
          <EmptyState
            title={view === "upcoming" ? "No upcoming trips" : "No past trips"}
            description={
              view === "upcoming"
                ? "Requests you send appear here while they are in progress."
                : "Completed, cancelled and closed requests appear here."
            }
            action={
              view === "upcoming" ? (
                <Link href="/search" className={buttonClasses({})}>
                  Search flights
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {trips.data.items.map((trip) => (
                <li key={trip.reference}>
                  <TripRow trip={trip} />
                </li>
              ))}
            </ul>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={trips.data.total}
              onPageChange={setPage}
            />
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}

function TripRow({ trip }: { trip: Trip }) {
  return (
    <Link
      href={`/account/trips/${trip.reference}`}
      className="flex flex-col gap-3 rounded-lg bg-surface p-4 transition-colors duration-150 ease-standard hover:bg-surface-raised md:flex-row md:items-center md:justify-between md:p-6"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-title">
          {trip.originName} to {trip.destinationName}
          {trip.tripType === "ROUND_TRIP" ? " and back" : ""}
        </p>
        <p className="text-body-sm text-muted">
          {formatDateTime(trip.departureAt)} · {trip.passengerCount} passenger
          {trip.passengerCount === 1 ? "" : "s"} · {trip.reference}
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          <StatusBadge kind="booking" status={trip.status} />
          <StatusBadge kind="payment" status={trip.paymentStatus} />
        </div>
      </div>
      {trip.price ? (
        <PriceLabel
          amountMinor={trip.price.amountMinor}
          currency={trip.price.currency}
          priceType={trip.price.priceType}
          variant="compact"
        />
      ) : (
        <p className="text-body-sm text-muted">Price on request</p>
      )}
    </Link>
  );
}
