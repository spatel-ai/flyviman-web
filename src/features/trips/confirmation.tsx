"use client";

import Link from "next/link";
import { CancellationTerms } from "@/components/shared/cancellation-terms";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { RecordNotFound } from "@/components/shared/record-not-found";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isNotFoundError } from "@/lib/api/errors";
import { categoryLabel, formatDuration } from "@/lib/format/aircraft";
import { formatDateTime } from "@/lib/format/date";
import { useBooking } from "./hooks";

/** Statuses in which the confirmation stands (as the documents route says). */
const CONFIRMED = new Set(["CONFIRMED", "SCHEDULED", "COMPLETED"]);

/**
 * The printable booking confirmation and itinerary, from the booking itself.
 * Shown only while the booking is confirmed; before that, or after a
 * cancellation, it says so and points back to the trip.
 */
export function TripConfirmation({ reference }: { reference: string }) {
  const booking = useBooking(reference);
  const tripHref = `/account/trips/${encodeURIComponent(reference)}`;

  if (booking.isPending) {
    return (
      <div role="status" aria-label="Loading">
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (booking.isError) {
    return isNotFoundError(booking.error) ? (
      <RecordNotFound
        title="Trip not found"
        description="This trip does not exist, or it is not one of yours."
        backHref="/account/trips"
        backLabel="Back to your trips"
      />
    ) : (
      <LoadError
        what="this confirmation"
        error={booking.error}
        onRetry={() => void booking.refetch()}
      />
    );
  }

  const b = booking.data;
  if (!CONFIRMED.has(b.status)) {
    return (
      <RecordNotFound
        title="No confirmation yet"
        description="The confirmation is available once the booking is confirmed."
        backHref={tripHref}
        backLabel="Back to your trip"
      />
    );
  }
  const { itinerary } = b;
  const emptyLeg = itinerary.emptyLeg;

  return (
    <article className="flex max-w-reading flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={tripHref}
          className="text-body-sm text-accent hover:underline"
        >
          Back to trip {b.reference}
        </Link>
        <Button variant="secondary" onClick={() => window.print()}>
          Print
        </Button>
      </div>
      <header className="flex flex-col gap-2">
        <h1 className="text-h3">Booking confirmation</h1>
        <p className="text-body-sm text-muted">
          Booking {b.reference}
          {b.confirmedAt ? ` · confirmed ${formatDateTime(b.confirmedAt)}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-body-sm text-muted">
          <span className="flex items-center gap-2">
            Booking <StatusBadge kind="booking" status={b.status} />
          </span>
          <span className="flex items-center gap-2">
            Payment <StatusBadge kind="payment" status={b.paymentStatus} />
          </span>
        </div>
      </header>

      <section aria-label="Itinerary" className="flex flex-col gap-2">
        <h2 className="text-title">Itinerary</h2>
        <ol className="flex flex-col gap-2">
          {itinerary.legs.map((leg) => (
            <li
              key={`${leg.originId}-${leg.departureAt}`}
              className="text-body"
            >
              {leg.originName} to {leg.destinationName}
              <span className="block text-body-sm text-muted">
                {emptyLeg
                  ? `Between ${formatDateTime(leg.departureAt)} and ${formatDateTime(emptyLeg.departureTo)}; the operator confirms the time`
                  : formatDateTime(leg.departureAt)}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-body-sm text-muted">
          {itinerary.aircraft.manufacturer} {itinerary.aircraft.model} ·{" "}
          {categoryLabel(itinerary.aircraft.category)} · operated by{" "}
          {itinerary.operatorName} · {itinerary.passengerCount} passenger
          {itinerary.passengerCount === 1 ? "" : "s"}
          {itinerary.flightMinutes != null
            ? ` · about ${formatDuration(itinerary.flightMinutes)}`
            : ""}
        </p>
        {emptyLeg ? (
          <p className="text-body-sm text-muted">
            Empty leg {emptyLeg.reference}. Conditions: {emptyLeg.conditions}
          </p>
        ) : null}
      </section>

      {b.passengers.length > 0 ? (
        <section aria-label="Passengers" className="flex flex-col gap-2">
          <h2 className="text-title">Passengers</h2>
          <ul className="text-body-sm">
            {b.passengers.map((p) => (
              <li key={`${p.firstName}-${p.lastName}-${p.documentNumberLast4}`}>
                {p.firstName} {p.lastName}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {b.price ? (
        <section aria-label="Price" className="flex flex-col gap-2">
          <h2 className="text-title">Price</h2>
          <PriceLabel
            amountMinor={b.price.amountMinor}
            currency={b.price.currency}
            priceType={b.price.priceType}
          />
        </section>
      ) : null}

      <CancellationTerms
        headingLevel={2}
        summary={b.cancellationTerms.summary}
        charges={b.cancellationTerms.charges}
      />
    </article>
  );
}
