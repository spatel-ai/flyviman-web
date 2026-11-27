"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { MedicalDetails } from "@/components/shared/air-ambulance/medical-details";
import {
  AirAmbulanceStatusBadge,
  AirAmbulanceTimeline,
} from "@/components/shared/air-ambulance/status";
import { FormAlert } from "@/components/shared/form-alert";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { RecordNotFound } from "@/components/shared/record-not-found";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { CLOSED_STATUSES } from "@/lib/air-ambulance/labels";
import { apiFetch } from "@/lib/api/client";
import { ApiError, isNotFoundError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { AddDocument } from "./add-document";
import { MAX_DOCUMENTS } from "./schema";

type Request = Schemas["AirAmbulanceRequestDto"];
type Action = "accept" | "decline" | "cancel";

/** Codes after which the screen is out of date and is reloaded. */
const STALE = new Set([
  "AIR_AMBULANCE_QUOTE_CHANGED",
  "AIR_AMBULANCE_INVALID_TRANSITION",
  "AIR_AMBULANCE_CLOSED",
]);

/**
 * One of the customer's requests: status, quote (labelled QUOTE, rule 1)
 * with its conditions before accepting (rule 9), medical details and
 * documents, timeline and withdrawal. Accepting is still a request: only
 * operations confirm (rule 7). Each load reads medical details, which the
 * API audits, so the data is not kept once the page closes.
 */
export function RequestDetail({
  reference,
  notice,
}: {
  reference: string;
  notice: "sent" | "documents" | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [action, setAction] = useState<Action | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const key = queryKeys.airAmbulanceRequest(reference);
  const path = `air-ambulance/requests/${encodeURIComponent(reference)}`;

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: key,
    queryFn: () => apiFetch<Request>(path),
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const act = useMutation({
    mutationFn: ({ kind, amount }: { kind: Action; amount?: number }) =>
      apiFetch<Schemas["AirAmbulanceSummaryDto"]>(
        kind === "cancel" ? `${path}/cancel` : `${path}/quote/${kind}`,
        {
          method: "POST",
          ...(kind === "accept"
            ? { body: { expectedAmountMinor: amount } }
            : {}),
        },
      ),
    onSuccess: (_result, { kind }) => {
      setAction(null);
      setActionError(null);
      toast({
        title:
          kind === "accept"
            ? "Quote accepted. Operations will confirm once every check is complete."
            : kind === "decline"
              ? "Quote declined"
              : "Request withdrawn",
        tone: "success",
      });
    },
    onError: (failure) => {
      setAction(null);
      setActionError(messageFor(failure));
    },
    onSettled: (_result, failure) => {
      if (
        !failure ||
        (failure instanceof ApiError && STALE.has(failure.code))
      ) {
        void queryClient.invalidateQueries({ queryKey: key });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.airAmbulanceListAll,
        });
      }
    },
  });

  if (isError && isNotFoundError(error)) {
    return (
      <RecordNotFound
        title="Request not found"
        description="This request does not exist, or the link is not correct."
        backHref="/account/air-ambulance"
        backLabel="Back to your requests"
      />
    );
  }
  if (isError) {
    return (
      <LoadError
        what="this request"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }
  if (isPending) {
    return (
      <>
        <p role="status" className="sr-only">
          Loading the request
        </p>
        <Skeleton className="h-96" />
      </>
    );
  }

  const request = data.data;
  const open = !CLOSED_STATUSES.includes(request.status);
  const quote = request.quote;
  const documents = request.medical?.documents.length ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/account/air-ambulance"
          className="text-body-sm text-accent hover:underline"
        >
          Your air ambulance requests
        </Link>
        <h1 className="text-h3 tabular-nums">{request.reference}</h1>
        <div>
          <AirAmbulanceStatusBadge status={request.status} />
        </div>
        {notice === "sent" ? (
          <p role="status" className="text-body-sm text-muted">
            Request sent. Operations will be in touch; it is not confirmed until
            the mission is verified.
          </p>
        ) : notice === "documents" ? (
          <p role="status" className="text-body-sm text-warning">
            Your request was sent, but some documents did not upload. Add them
            again below.
          </p>
        ) : null}
      </div>

      <FormAlert message={actionError} />

      {quote ? (
        <section
          aria-labelledby="quote-heading"
          className="flex flex-col gap-4 rounded-lg bg-surface p-6"
        >
          <h2 id="quote-heading" className="text-title">
            Quote
          </h2>
          <PriceLabel
            amountMinor={quote.price.amountMinor}
            currency={quote.price.currency}
            priceType={quote.price.priceType}
          />
          {quote.operatorName ? (
            <p className="text-body-sm text-muted">
              Operator: {quote.operatorName}
            </p>
          ) : null}
          <div>
            <h3 className="text-body font-medium">Conditions</h3>
            <p className="mt-1 max-w-reading text-body-sm whitespace-pre-wrap">
              {quote.conditions ?? "No conditions given."}
            </p>
          </div>
          {request.status === "QUOTED" ? (
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setAction("accept")}>Accept quote</Button>
              <Button variant="danger" onClick={() => setAction("decline")}>
                Decline
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section
        aria-labelledby="journey-heading"
        className="flex flex-col gap-4"
      >
        <h2 id="journey-heading" className="text-title">
          Journey
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-body-sm text-muted">From</dt>
            <dd>{request.originName ?? "Unknown location"}</dd>
          </div>
          <div>
            <dt className="text-body-sm text-muted">To</dt>
            <dd>{request.destinationName ?? "Unknown location"}</dd>
          </div>
          <div>
            <dt className="text-body-sm text-muted">Collection address</dt>
            <dd className="break-words">
              {request.pickupAddress ?? "Not given"}
            </dd>
          </div>
          <div>
            <dt className="text-body-sm text-muted">Receiving facility</dt>
            <dd className="break-words">
              {request.destinationFacility ?? "Not given"}
            </dd>
          </div>
          <div>
            <dt className="text-body-sm text-muted">Preferred time</dt>
            <dd>{formatDateTime(request.preferredAt)}</dd>
          </div>
          <div>
            <dt className="text-body-sm text-muted">Travelling</dt>
            <dd>
              {request.patientCount}{" "}
              {request.patientCount === 1 ? "patient" : "patients"},{" "}
              {request.accompanyingPersons} with them
            </dd>
          </div>
          <div>
            <dt className="text-body-sm text-muted">Contact</dt>
            <dd className="break-words">
              {request.contactName}, {request.contactPhone}
            </dd>
          </div>
        </dl>
      </section>

      {request.medical ? (
        <section
          aria-labelledby="medical-heading"
          className="flex flex-col gap-4"
        >
          <h2 id="medical-heading" className="text-title">
            Medical details
          </h2>
          <MedicalDetails medical={request.medical} />
          {open && documents < MAX_DOCUMENTS ? (
            <AddDocument reference={request.reference} />
          ) : null}
        </section>
      ) : null}

      <section
        aria-labelledby="timeline-heading"
        className="flex flex-col gap-4"
      >
        <h2 id="timeline-heading" className="text-title">
          Timeline
        </h2>
        <AirAmbulanceTimeline entries={request.timeline} />
      </section>

      {open ? (
        <div>
          <Button variant="destructive" onClick={() => setAction("cancel")}>
            Withdraw request
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={action === "accept"}
        onOpenChange={(next) => !next && setAction(null)}
        title="Accept this quote?"
        description={
          quote
            ? `You accept ${formatMoney(quote.price.amountMinor, quote.price.currency)} and the conditions shown. This is still a request: operations confirm once the operator and every check have verified the mission.`
            : ""
        }
        confirmLabel="Accept quote"
        loading={act.isPending}
        onConfirm={() =>
          quote &&
          act.mutate({ kind: "accept", amount: quote.price.amountMinor })
        }
      />
      <ConfirmDialog
        open={action === "decline"}
        onOpenChange={(next) => !next && setAction(null)}
        title="Decline this quote?"
        description="The request closes and cannot be reopened. To travel later, send a new request."
        confirmLabel="Decline quote"
        destructive
        loading={act.isPending}
        onConfirm={() => act.mutate({ kind: "decline" })}
      />
      <ConfirmDialog
        open={action === "cancel"}
        onOpenChange={(next) => !next && setAction(null)}
        title="Withdraw this request?"
        description="Operations stop working on it and it cannot be reopened."
        confirmLabel="Withdraw request"
        destructive
        loading={act.isPending}
        onConfirm={() => act.mutate({ kind: "cancel" })}
      />
    </div>
  );
}
