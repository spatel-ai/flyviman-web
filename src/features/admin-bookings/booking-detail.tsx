"use client";

import { roleLabel } from "@/lib/format/labels";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { CancellationTerms } from "@/components/shared/cancellation-terms";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { RecordNotFound } from "@/components/shared/record-not-found";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { isNotFoundError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime, formatDay } from "@/lib/format/date";
import { categoryName, STATUS_LABELS } from "./filters";
import { ChangeRequestCard } from "./change-request-card";
import { EscalationBanner, EscalationControl } from "./escalation";
import { Notes } from "./notes";
import { OverrideDialog } from "./override-dialog";
import { OwnerControl } from "./owner-control";
import { eventLabel, isPaidNotConfirmed, reviewReasonLabel } from "./status";

type Detail = Schemas["AdminBookingDetailDto"];

const QUOTE_STATUS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent, waiting for the customer",
  ACCEPTED: "Accepted by the customer",
  REJECTED: "Declined by the customer",
  EXPIRED: "Expired",
  SUPERSEDED: "Replaced by a newer quote",
};

function statusName(status: string): string {
  return Object.hasOwn(STATUS_LABELS, status)
    ? STATUS_LABELS[status as keyof typeof STATUS_LABELS]
    : status;
}

export function BookingDetail({
  reference,
  canAct,
  viewerId,
}: {
  reference: string;
  /** Operations and super administrators; finance reads. The API decides too. */
  canAct: boolean;
  viewerId: string | undefined;
}) {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.adminBooking(reference),
    queryFn: () =>
      apiFetch<Detail>(`admin/bookings/${encodeURIComponent(reference)}`),
  });

  if (isError && isNotFoundError(error)) {
    return (
      <RecordNotFound
        title="Booking not found"
        description="This booking does not exist, or the link is not correct."
        backHref="/admin/bookings"
        backLabel="Back to bookings"
      />
    );
  }

  return (
    <>
      <Link
        href="/admin/bookings"
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
        <Loaded booking={data.data} canAct={canAct} viewerId={viewerId} />
      )}
    </>
  );
}

function Loaded({
  booking,
  canAct,
  viewerId,
}: {
  booking: Detail;
  canAct: boolean;
  viewerId: string | undefined;
}) {
  const [overriding, setOverriding] = useState(false);
  const itinerary = booking.itinerary;

  return (
    <div className="mt-4 flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-h2">Booking {booking.reference}</h1>
        <StatusBadge
          kind="booking"
          status={booking.status}
          quoteOpen={booking.quotes.some((quote) => quote.open)}
        />
        <StatusBadge kind="payment" status={booking.paymentStatus} />
        <span className="text-body-sm text-muted">
          {categoryName(booking.category)}
        </span>
        {booking.escalation ? <Badge tone="danger">Escalated</Badge> : null}
      </div>

      <EscalationBanner booking={booking} />

      {isPaidNotConfirmed(booking) ? (
        <div
          role="alert"
          data-testid="paid-not-confirmed"
          className="rounded-lg bg-warning/12 p-4 text-body-sm"
        >
          <p className="font-medium">Paid but not confirmed</p>
          <p className="mt-1">
            Money has arrived for this booking, but it is still awaiting
            payment. A payment never confirms a booking by itself, and the
            confirmation was blocked (the aircraft or the price could not be
            rechecked). Operations must decide: confirm it, change its status,
            or arrange a refund.
          </p>
        </div>
      ) : null}

      <Card className="grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="text-title">Itinerary</h2>
          <ol className="mt-2 flex flex-col gap-2">
            {itinerary.legs.map((leg, index) => (
              <li key={index} className="text-body-sm">
                <span className="font-medium">
                  {leg.originName} to {leg.destinationName}
                </span>
                <span className="block text-muted">
                  {itinerary.emptyLeg
                    ? `Empty leg ${itinerary.emptyLeg.reference}: between ${formatDateTime(leg.departureAt)} and ${formatDateTime(itinerary.emptyLeg.departureTo)}`
                    : `Departs ${formatDateTime(leg.departureAt)}`}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-body-sm text-muted">
            {itinerary.aircraft.manufacturer} {itinerary.aircraft.model}
            {booking.aircraftRegistration
              ? `, ${booking.aircraftRegistration}`
              : ""}
            , {booking.passengerCount} passengers
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="text-title">Price</h2>
          {booking.price ? (
            <PriceLabel
              amountMinor={booking.price.amountMinor}
              currency={booking.price.currency}
              priceType={booking.price.priceType}
              validUntil={booking.price.validUntil ?? undefined}
            />
          ) : (
            <p className="text-body-sm">
              Price on request: no quote accepted yet.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <dl className="grid gap-4 text-body-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Customer</dt>
            <dd className="break-all">{booking.customer.email ?? "-"}</dd>
            <dd className="text-muted">{booking.customer.phone ?? ""}</dd>
          </div>
          <div>
            <dt className="text-muted">Operator</dt>
            <dd>{booking.operator?.name ?? itinerary.operatorName}</dd>
          </div>
          <div>
            <dt className="text-muted">Requested</dt>
            <dd>{formatDateTime(booking.createdAt)}</dd>
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

      {canAct ? (
        <Card className="flex flex-col gap-4">
          <h2 className="text-title">Operations</h2>
          <OwnerControl
            reference={booking.reference}
            assignedToId={booking.assignedToId}
            viewerId={viewerId}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              className="h-10"
              onClick={() => setOverriding(true)}
            >
              Override status
            </Button>
            <EscalationControl booking={booking} />
          </div>
          <OverrideDialog
            booking={booking}
            open={overriding}
            onOpenChange={setOverriding}
          />
        </Card>
      ) : null}

      <section
        aria-labelledby="passengers-heading"
        className="flex flex-col gap-3"
      >
        <h2 id="passengers-heading" className="text-title">
          Passengers
        </h2>
        {booking.passengers === null ? (
          <p className="text-body-sm text-muted">
            Passenger details are not shown to your role.
          </p>
        ) : booking.passengers.length === 0 ? (
          <p className="text-body-sm text-muted">
            No passenger details have been added yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {booking.passengers.map((passenger, index) => (
              <li
                key={index}
                className="rounded-lg bg-surface p-4 text-body-sm"
              >
                <p className="font-medium">
                  {passenger.firstName} {passenger.lastName}
                </p>
                <p className="text-muted">
                  {[
                    passenger.dateOfBirth
                      ? `Born ${formatDay(passenger.dateOfBirth)}`
                      : null,
                    passenger.nationality,
                    passenger.documentType
                      ? `${passenger.documentType.replaceAll("_", " ").toLowerCase()} ending ${passenger.documentNumberLast4 ?? "-"}`
                      : null,
                    passenger.documentExpiry
                      ? `expires ${formatDay(passenger.documentExpiry)}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {passenger.specialAssistance ? (
                  <p className="mt-1">
                    Assistance: {passenger.specialAssistance}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {booking.passengers !== null ? (
          <p className="whitespace-pre-wrap text-body-sm">
            <span className="text-muted">Special requests: </span>
            {booking.specialRequests ?? "None."}
          </p>
        ) : null}
      </section>

      <Card>
        <CancellationTerms
          headingLevel={2}
          summary={booking.cancellationTerms.summary}
          charges={booking.cancellationTerms.charges}
        />
      </Card>

      <section
        aria-labelledby="timeline-heading"
        className="flex flex-col gap-3"
      >
        <h2 id="timeline-heading" className="text-title">
          Timeline
        </h2>
        <ol className="flex flex-col gap-3">
          {booking.events.map((event) => (
            <li
              key={event.id}
              className="rounded-lg bg-surface p-4 text-body-sm"
            >
              <p className="font-medium">
                {eventLabel(event.type)}
                {event.toStatus ? (
                  <span className="font-normal">
                    {": "}
                    {event.fromStatus
                      ? `${statusName(event.fromStatus)} to `
                      : ""}
                    {statusName(event.toStatus)}
                  </span>
                ) : null}
              </p>
              <p className="text-caption text-muted">
                {formatDateTime(event.createdAt)}
                {event.actorRole ? ` · ${roleLabel(event.actorRole)}` : ""}
              </p>
              {event.overrideReason ? (
                <p className="mt-1">Reason: {event.overrideReason}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="quotes-heading" className="flex flex-col gap-3">
        <h2 id="quotes-heading" className="text-title">
          Quotes
        </h2>
        {booking.quotes.length === 0 ? (
          <p className="text-body-sm text-muted">No quote has been sent.</p>
        ) : (
          booking.quotes.map((quote) => (
            <Card key={quote.reference} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{quote.reference}</p>
                <Badge
                  tone={quote.status === "ACCEPTED" ? "success" : "neutral"}
                >
                  {Object.hasOwn(QUOTE_STATUS, quote.status)
                    ? QUOTE_STATUS[quote.status]
                    : quote.status}
                </Badge>
              </div>
              <PriceLabel
                amountMinor={quote.price.amountMinor}
                currency={quote.price.currency}
                priceType={quote.price.priceType}
                validUntil={quote.price.validUntil}
                expired={quote.status === "EXPIRED"}
              />
            </Card>
          ))
        )}
      </section>

      <section
        aria-labelledby="payments-heading"
        className="flex flex-col gap-3"
      >
        <h2 id="payments-heading" className="text-title">
          Payments
        </h2>
        {booking.payments.length === 0 ? (
          <p className="text-body-sm text-muted">
            No payment has been started.
          </p>
        ) : (
          booking.payments.map((payment) => (
            <Card key={payment.reference} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{payment.reference}</p>
                <StatusBadge kind="payment" status={payment.status} />
                <span className="text-caption text-muted">
                  {payment.purpose.toLowerCase()}
                </span>
              </div>
              <PriceLabel
                amountMinor={payment.price.amountMinor}
                currency={payment.price.currency}
                priceType={payment.price.priceType}
                variant="compact"
                className="items-start"
              />
              {payment.reviewReason ? (
                <p className="text-body-sm text-warning">
                  Needs review: {reviewReasonLabel(payment.reviewReason)}
                </p>
              ) : null}
              <p className="text-caption text-muted">
                {payment.paidAt
                  ? `Paid ${formatDateTime(payment.paidAt)}`
                  : `Started ${formatDateTime(payment.createdAt)}`}
              </p>
            </Card>
          ))
        )}
      </section>

      <section
        aria-labelledby="changes-heading"
        className="flex flex-col gap-3"
      >
        <h2 id="changes-heading" className="text-title">
          Change requests
        </h2>
        {booking.changeRequests.length === 0 ? (
          <p className="text-body-sm text-muted">
            The customer has not asked for a change.
          </p>
        ) : (
          booking.changeRequests.map((request) => (
            <ChangeRequestCard
              key={request.id}
              request={request}
              canDecide={canAct}
            />
          ))
        )}
      </section>

      {booking.notes !== null ? (
        <Notes reference={booking.reference} notes={booking.notes} />
      ) : null}
    </div>
  );
}
