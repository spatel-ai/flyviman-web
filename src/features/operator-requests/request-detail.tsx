"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { RecordNotFound } from "@/components/shared/record-not-found";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { isNotFoundError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { FormAlert } from "@/components/shared/form-alert";
import { ChangeRequests } from "./change-requests";
import { HoldTime } from "./hold-time";
import { RequestActions } from "./request-actions";
import { quoteStatusLabel } from "./status";
import { useAct } from "./use-act";

type Detail = Schemas["OperatorBookingRequestDetailDto"];

export function RequestDetail({ reference }: { reference: string }) {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.operatorRequest(reference),
    queryFn: () =>
      apiFetch<Detail>(
        `operator/booking-requests/${encodeURIComponent(reference)}`,
      ),
  });
  const { act, finished, conflict, problem } = useAct();

  if (isError && isNotFoundError(error)) {
    return (
      <RecordNotFound
        title="Request not found"
        description="This request does not exist, or it is not for one of your aircraft."
        backHref="/operator/requests"
        backLabel="Back to requests"
      />
    );
  }

  return (
    <>
      <Link
        href="/operator/requests"
        className="text-body-sm text-accent hover:underline"
      >
        Requests
      </Link>
      {isError ? (
        <div className="mt-4">
          <h1 className="text-h2">Request {reference}</h1>
          <div className="mt-4">
            <LoadError
              what="this request"
              error={error}
              onRetry={() => void refetch()}
            />
          </div>
        </div>
      ) : isPending ? (
        <div className="mt-4" aria-busy="true">
          <p role="status" className="sr-only">
            Loading the request
          </p>
          <h1 className="text-h2">Request {reference}</h1>
          <Skeleton className="mt-6 h-40" />
          <Skeleton className="mt-4 h-40" />
        </div>
      ) : (
        <Loaded
          request={data.data}
          act={act}
          finished={finished}
          conflict={conflict}
          problem={problem}
        />
      )}
    </>
  );
}

function Loaded({
  request,
  act,
  finished,
  conflict,
  problem,
}: {
  request: Detail;
  act: ReturnType<typeof useAct>["act"];
  finished: ReturnType<typeof useAct>["finished"];
  conflict: ReturnType<typeof useAct>["conflict"];
  problem: string | null;
}) {
  return (
    <div className="mt-4 flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-h2">Request {request.reference}</h1>
        <StatusBadge
          kind="booking"
          status={request.status}
          quoteOpen={request.quote?.open === true}
        />
      </div>

      <Card className="grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="text-title">Trip</h2>
          <ol className="mt-2 flex flex-col gap-2">
            {request.legs.map((leg, index) => (
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
          <div>
            <dt className="text-muted">Aircraft</dt>
            <dd>
              {request.aircraft.registration}, {request.aircraft.manufacturer}{" "}
              {request.aircraft.model}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Passengers</dt>
            <dd>{request.passengerCount}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted">Proposed price</dt>
            <dd>
              {request.price ? (
                <PriceLabel
                  amountMinor={request.price.amountMinor}
                  currency={request.price.currency}
                  priceType={request.price.priceType}
                  note="Flyviman's estimate from the customer's search. The operator's quote sets the price."
                />
              ) : (
                <span className="font-medium">
                  Price on request: send a quote
                </span>
              )}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted">Hold on your aircraft</dt>
            <dd>
              <HoldTime expiresAt={request.holdExpiresAt} />
            </dd>
          </div>
        </dl>
      </Card>

      <RequestActions
        request={request}
        act={act}
        finished={finished}
        conflict={conflict}
        problem={problem}
      />
      {!(request.status === "OPERATOR_PENDING") && problem ? (
        <FormAlert message={problem} />
      ) : null}

      <Card>
        <h2 className="text-title">Special requests</h2>
        <p className="mt-2 whitespace-pre-wrap text-body-sm">
          {request.specialRequests ?? (
            <span className="text-muted">None from the customer.</span>
          )}
        </p>
      </Card>

      <Card>
        <h2 className="text-title">Cancellation terms in force</h2>
        <p className="mt-2 text-body-sm">{request.cancellationTerms.summary}</p>
        {request.cancellationTerms.charges.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1 text-body-sm text-muted">
            {request.cancellationTerms.charges.map((charge) => (
              <li key={charge.minHoursBeforeDeparture}>
                {charge.minHoursBeforeDeparture} hours or more before departure:{" "}
                {charge.chargePercent}% of the total
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <section aria-labelledby="quotes-heading" className="flex flex-col gap-3">
        <h2 id="quotes-heading" className="text-title">
          Quotes
        </h2>
        {request.quotes.length === 0 ? (
          <p className="text-body-sm text-muted">You have not sent a quote.</p>
        ) : (
          request.quotes.map((quote) => {
            const status = quoteStatusLabel(quote.status);
            return (
              <Card key={quote.reference} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{quote.reference}</p>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
                {quote.operatorPrice ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-caption text-muted">Your price</p>
                    <PriceLabel
                      amountMinor={quote.operatorPrice.amountMinor}
                      currency={quote.operatorPrice.currency}
                      priceType={quote.operatorPrice.priceType}
                      expired={quote.status === "EXPIRED"}
                    />
                  </div>
                ) : null}
                <div className="flex flex-col gap-1">
                  <p className="text-caption text-muted">
                    The customer&apos;s total, with Flyviman&apos;s fees and
                    taxes
                  </p>
                  <PriceLabel
                    amountMinor={quote.price.amountMinor}
                    currency={quote.price.currency}
                    priceType={quote.price.priceType}
                    validUntil={quote.price.validUntil}
                    expired={quote.status === "EXPIRED"}
                  />
                </div>
                <p className="text-caption text-muted">
                  Sent {formatDateTime(quote.createdAt)}
                </p>
              </Card>
            );
          })
        )}
      </section>

      <section
        aria-labelledby="messages-heading"
        className="flex flex-col gap-3"
      >
        <h2 id="messages-heading" className="text-title">
          Messages with the customer
        </h2>
        {request.messages.length === 0 ? (
          <p className="text-body-sm text-muted">No messages yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {request.messages.map((message, index) => (
              <li key={index} className="rounded-lg bg-surface p-4">
                <p className="text-caption text-muted">
                  {message.from === "OPERATOR" ? "You" : "Customer"},{" "}
                  {formatDateTime(message.createdAt)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-body-sm">
                  {message.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ChangeRequests
        requests={request.changeRequests}
        act={act}
        onConflict={conflict}
      />

      <Notes request={request} act={act} />
    </div>
  );
}

function Notes({
  request,
  act,
}: {
  request: Detail;
  act: ReturnType<typeof useAct>["act"];
}) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const trimmed = text.trim();

  async function add() {
    setPending(true);
    setProblem(null);
    try {
      await act("Note added", () =>
        apiFetch(
          `operator/bookings/${encodeURIComponent(request.reference)}/notes`,
          { method: "POST", body: { note: trimmed } },
        ),
      );
      setText("");
    } catch (error) {
      setProblem(messageFor(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="notes-heading" className="flex flex-col gap-3">
      <h2 id="notes-heading" className="text-title">
        Internal notes
      </h2>
      <p className="text-body-sm text-muted">
        For your team only. Never shown to the customer.
      </p>
      {request.notes.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {request.notes.map((note) => (
            <li key={note.id} className="rounded-lg bg-surface p-4">
              <p className="text-caption text-muted">
                {formatDateTime(note.createdAt)}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-body-sm">
                {note.body}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      <form
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (trimmed && trimmed.length <= 2000) void add();
        }}
      >
        <FormAlert message={problem} />
        <Textarea
          label="Add a note"
          rows={3}
          value={text}
          onChange={(event) => setText(event.target.value)}
          error={
            trimmed.length > 2000
              ? "Keep this under 2,000 characters"
              : undefined
          }
        />
        <Button
          type="submit"
          variant="secondary"
          className="h-11 self-start"
          loading={pending}
          disabled={!trimmed || trimmed.length > 2000}
        >
          Add note
        </Button>
      </form>
    </section>
  );
}
