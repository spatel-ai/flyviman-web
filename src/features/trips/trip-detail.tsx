"use client";

import Link from "next/link";
import { useState } from "react";
import { CancellationTerms } from "@/components/shared/cancellation-terms";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { RecordNotFound } from "@/components/shared/record-not-found";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { isNotFoundError } from "@/lib/api/errors";
import type { Schemas } from "@/lib/api/types";
import { categoryLabel, formatDuration } from "@/lib/format/aircraft";
import { formatDateTime } from "@/lib/format/date";
import { CancelDialog } from "./cancel-dialog";
import { ChangeRequests } from "./change-request";
import { TripDocuments } from "./documents";
import { useBooking, useEvents } from "./hooks";
import { Messages } from "./messages";
import { canEditPassengers, PassengersDialog } from "./passengers-dialog";
import { PaymentHistory } from "./payments";
import { Quotes } from "./quotes";
import { isInProgress } from "./status";
import { buildTimeline } from "./timeline";

type Booking = Schemas["BookingResponseDto"];

export function TripDetail({ reference }: { reference: string }) {
  const booking = useBooking(reference);

  if (booking.isPending) {
    return (
      <div
        role="status"
        aria-label="Loading your trip"
        className="flex flex-col gap-4"
      >
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64" />
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
        what="this trip"
        error={booking.error}
        onRetry={() => void booking.refetch()}
      />
    );
  }
  return <Loaded booking={booking.data} />;
}

function Loaded({ booking }: { booking: Booking }) {
  const [cancelling, setCancelling] = useState(false);
  const [editingPassengers, setEditingPassengers] = useState(false);
  const { itinerary } = booking;
  // The API decides what is due now (W4-1); null hides Pay.
  const due = booking.amountDue;
  // Under the booking's key: whatever refreshes the trip refreshes this.
  const events = useEvents(booking.reference);
  const timeline = buildTimeline(events.data ?? []);
  const editable = canEditPassengers(booking.status);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/account/trips"
          className="text-body-sm text-accent hover:underline"
        >
          All trips
        </Link>
        <h1 className="text-h3 md:text-h2">Trip {booking.reference}</h1>
        {/* Booking status and payment status are never combined. */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-body-sm text-muted">
          <span className="flex items-center gap-2">
            Booking <StatusBadge kind="booking" status={booking.status} />
          </span>
          <span className="flex items-center gap-2">
            Payment{" "}
            <StatusBadge kind="payment" status={booking.paymentStatus} />
          </span>
        </div>
      </div>

      {due ? (
        <Card className="flex flex-col gap-3" aria-label="Payment due">
          <h2 className="text-title">
            {due.kind === "DEPOSIT"
              ? "Deposit due"
              : due.kind === "BALANCE"
                ? "Balance due"
                : "Payment due"}
          </h2>
          <PriceLabel
            amountMinor={due.amountMinor}
            currency={due.currency}
            priceType={due.priceType}
          />
          {due.kind === "DEPOSIT" ? (
            <p className="text-body-sm text-muted">
              This trip takes a deposit now and the balance later.
            </p>
          ) : null}
          {/* A full page load: only the payment page's policy allows the
              payment provider (lib/csp.ts). */}
          <a
            href={`/account/trips/${encodeURIComponent(booking.reference)}/pay`}
            className={buttonClasses({ className: "self-start" })}
          >
            {due.kind === "DEPOSIT"
              ? "Pay deposit"
              : due.kind === "BALANCE"
                ? "Pay balance"
                : "Pay"}
          </a>
        </Card>
      ) : null}

      <section
        aria-labelledby="itinerary-heading"
        className="flex flex-col gap-3"
      >
        <h2 id="itinerary-heading" className="text-title">
          Itinerary
        </h2>
        <ol className="flex flex-col gap-2">
          {itinerary.legs.map((leg) => (
            <li
              key={`${leg.originId}-${leg.departureAt}`}
              className="text-body"
            >
              {leg.originName} to {leg.destinationName}
              <span className="block text-body-sm text-muted">
                {itinerary.emptyLeg
                  ? `Between ${formatDateTime(leg.departureAt)} and ${formatDateTime(itinerary.emptyLeg.departureTo)}; the operator confirms the time`
                  : formatDateTime(leg.departureAt)}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-body-sm text-muted">
          {itinerary.aircraft.manufacturer} {itinerary.aircraft.model} ·{" "}
          {categoryLabel(itinerary.aircraft.category)} · operated by{" "}
          {itinerary.operatorName} · {itinerary.passengerCount} passenger
          {itinerary.passengerCount === 1 ? "" : "s"} · {itinerary.distanceKm}{" "}
          km
          {itinerary.flightMinutes != null
            ? ` · about ${formatDuration(itinerary.flightMinutes)}`
            : ""}
        </p>
      </section>

      <section aria-labelledby="price-heading" className="flex flex-col gap-3">
        <h2 id="price-heading" className="text-title">
          Price
        </h2>
        {booking.price ? (
          <PriceLabel
            amountMinor={booking.price.amountMinor}
            currency={booking.price.currency}
            priceType={booking.price.priceType}
            validUntil={booking.price.validUntil ?? undefined}
          />
        ) : (
          <p className="text-body">
            Price on request. The operator will send a quote.
          </p>
        )}
      </section>

      <PaymentHistory reference={booking.reference} />

      <TripDocuments reference={booking.reference} />

      <Quotes reference={booking.reference} />
      <Messages
        reference={booking.reference}
        awaitingAnswer={booking.status === "CLARIFICATION_REQUESTED"}
      />

      <div id="cancellation-terms">
        <CancellationTerms
          headingLevel={2}
          summary={booking.cancellationTerms.summary}
          charges={booking.cancellationTerms.charges}
        />
      </div>

      {booking.passengers.length > 0 || booking.specialRequests || editable ? (
        <section
          aria-labelledby="passengers-heading"
          className="flex flex-col gap-3"
        >
          <h2 id="passengers-heading" className="text-title">
            Passengers
          </h2>
          {booking.passengers.length > 0 ? (
            <ul className="text-body-sm">
              {booking.passengers.map((p) => (
                <li
                  key={`${p.firstName}-${p.lastName}-${p.documentNumberLast4}`}
                >
                  {p.firstName} {p.lastName}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-sm text-muted">
              No passengers yet. Add who is flying before the trip.
            </p>
          )}
          {booking.specialRequests ? (
            <p className="text-body-sm text-muted">
              Special requests: {booking.specialRequests}
            </p>
          ) : null}
          {editable ? (
            <>
              <Button
                variant="secondary"
                className="self-start"
                onClick={() => setEditingPassengers(true)}
              >
                {booking.passengers.length > 0
                  ? "Change passengers"
                  : "Add passengers"}
              </Button>
              <PassengersDialog
                reference={booking.reference}
                limit={itinerary.passengerCount}
                current={booking.passengers}
                open={editingPassengers}
                onOpenChange={setEditingPassengers}
              />
            </>
          ) : null}
        </section>
      ) : null}

      <ChangeRequests booking={booking} />

      <section
        aria-labelledby="timeline-heading"
        className="flex flex-col gap-3"
      >
        <h2 id="timeline-heading" className="text-title">
          Timeline
        </h2>
        {events.isError ? (
          <LoadError
            what="the timeline"
            error={events.error}
            onRetry={() => void events.refetch()}
          />
        ) : events.isPending ? (
          <Skeleton className="h-24" />
        ) : (
          <ol className="flex flex-col gap-3">
            {timeline.map((entry) => (
              <li key={entry.id} className="text-body-sm">
                <span className="font-medium">{entry.label}</span>
                <span className="block text-caption text-muted">
                  {formatDateTime(entry.at)}
                </span>
                {entry.price ? (
                  <PriceLabel
                    amountMinor={entry.price.amountMinor}
                    currency={entry.price.currency}
                    priceType={entry.price.priceType}
                    variant="compact"
                    className="items-start"
                  />
                ) : null}
                {entry.note ? (
                  <span className="block text-muted">{entry.note}</span>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      {isInProgress(booking.status) ? (
        <div className="flex flex-col items-start gap-2">
          <Button variant="destructive" onClick={() => setCancelling(true)}>
            Cancel this trip
          </Button>
          <p className="text-caption text-muted">
            You will see what it costs before anything is cancelled.
          </p>
          <CancelDialog
            reference={booking.reference}
            open={cancelling}
            onOpenChange={setCancelling}
          />
        </div>
      ) : null}
    </div>
  );
}
