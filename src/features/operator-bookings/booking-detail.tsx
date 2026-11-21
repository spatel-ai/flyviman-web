"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CancellationTerms } from "@/components/shared/cancellation-terms";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { RecordNotFound } from "@/components/shared/record-not-found";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { isNotFoundError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { BookingActions } from "./booking-actions";

type Detail = Schemas["OperatorBookingDetailDto"];

export function BookingDetail({ reference }: { reference: string }) {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.operatorBooking(reference),
    queryFn: () =>
      apiFetch<Detail>(`operator/bookings/${encodeURIComponent(reference)}`),
  });

  if (isError && isNotFoundError(error)) {
    return (
      <RecordNotFound
        title="Booking not found"
        description="This booking does not exist, or it is not on one of your aircraft."
        backHref="/operator/bookings"
        backLabel="Back to bookings"
      />
    );
  }

  return (
    <>
      <Link
        href="/operator/bookings"
        className="text-body-sm text-accent hover:underline"
      >
        Bookings
      </Link>
      {isError ? (
        <div className="mt-4">
          <h1 className="text-h2">Booking {reference}</h1>
          <div className="mt-4">
            <LoadError
              what="this booking"
              error={error}
              onRetry={() => void refetch()}
            />
          </div>
        </div>
      ) : isPending ? (
        <div className="mt-4" aria-busy="true">
          <p role="status" className="sr-only">
            Loading the booking
          </p>
          <h1 className="text-h2">Booking {reference}</h1>
          <Skeleton className="mt-6 h-40" />
          <Skeleton className="mt-4 h-40" />
        </div>
      ) : (
        <Loaded booking={data.data} />
      )}
    </>
  );
}

function Loaded({ booking }: { booking: Detail }) {
  return (
    <div className="mt-4 flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-h2">Booking {booking.reference}</h1>
        <StatusBadge kind="booking" status={booking.status} />
        <StatusBadge kind="payment" status={booking.paymentStatus} />
      </div>

      <Card className="grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="text-title">Trip</h2>
          <ol className="mt-2 flex flex-col gap-2">
            {booking.legs.map((leg, index) => (
              <li key={index} className="text-body-sm">
                <span className="font-medium">
                  {leg.originName} to {leg.destinationName}
                </span>
                <span className="block text-muted">
                  Departs {formatDateTime(leg.departureAt)}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-body-sm">
          <div className="min-w-0">
            <dt className="text-muted">Aircraft</dt>
            <dd>
              {booking.aircraft.registration}, {booking.aircraft.manufacturer}{" "}
              {booking.aircraft.model}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Passengers</dt>
            <dd>{booking.passengerCount}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted">Customer&apos;s total</dt>
            <dd>
              {booking.price ? (
                <PriceLabel
                  amountMinor={booking.price.amountMinor}
                  currency={booking.price.currency}
                  priceType={booking.price.priceType}
                />
              ) : (
                <span className="font-medium">Price on request</span>
              )}
            </dd>
          </div>
          {booking.confirmedAt ? (
            <div>
              <dt className="text-muted">Confirmed</dt>
              <dd>{formatDateTime(booking.confirmedAt)}</dd>
            </div>
          ) : null}
          {booking.cancelledAt ? (
            <div>
              <dt className="text-muted">Cancelled</dt>
              <dd>{formatDateTime(booking.cancelledAt)}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      <BookingActions booking={booking} />

      <Card>
        <h2 className="text-title">Passenger manifest</h2>
        {booking.passengers === null ? (
          <p className="mt-2 text-body-sm text-muted">
            Names are shown once the booking is confirmed.
          </p>
        ) : booking.passengers.length === 0 ? (
          <p className="mt-2 text-body-sm text-muted">
            The customer has not added passenger names yet.
          </p>
        ) : (
          <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-body-sm">
            {booking.passengers.map((passenger, index) => (
              <li key={index}>
                {passenger.firstName} {passenger.lastName}
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card>
        <h2 className="text-title">Special requests</h2>
        <p className="mt-2 whitespace-pre-wrap text-body-sm">
          {booking.specialRequests ?? (
            <span className="text-muted">None from the customer.</span>
          )}
        </p>
      </Card>

      <Card>
        <h2 className="text-title">Cancellation terms in force</h2>
        <CancellationTerms
          className="mt-2"
          summary={booking.cancellationTerms.summary}
          charges={booking.cancellationTerms.charges}
        />
      </Card>

      <p className="text-body-sm">
        <Link
          href={`/operator/requests/${encodeURIComponent(booking.reference)}`}
          className="text-accent hover:underline"
        >
          Messages, quotes, change requests and notes
        </Link>
      </p>
    </div>
  );
}
