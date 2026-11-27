"use client";

import { roleLabel } from "@/lib/format/labels";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { MedicalDetails } from "@/components/shared/air-ambulance/medical-details";
import { AirAmbulanceStatusBadge } from "@/components/shared/air-ambulance/status";
import { FormAlert } from "@/components/shared/form-alert";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { RecordNotFound } from "@/components/shared/record-not-found";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  CLOSED_STATUSES,
  statusPresentation,
} from "@/lib/air-ambulance/labels";
import { apiFetch } from "@/lib/api/client";
import { ApiError, isNotFoundError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Role, Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { FeasibilityForm } from "./feasibility-form";
import { QuoteForm } from "./quote-form";

type Request = Schemas["AdminAirAmbulanceRequestDto"];
type Target = Schemas["MoveAirAmbulanceDto"]["status"];

/** The next step forward from each status, for the owner. */
const FORWARD: Partial<Record<string, { to: Target; label: string }>> = {
  ASSIGNED: { to: "SOURCING", label: "Start sourcing" },
  SOURCING: { to: "FEASIBILITY_CHECK", label: "Start feasibility check" },
  ACCEPTED: { to: "CONFIRMED", label: "Confirm mission" },
  CONFIRMED: { to: "COMPLETED", label: "Mark completed" },
};

const FEASIBILITY_STATUSES = ["FEASIBILITY_CHECK", "QUOTED", "ACCEPTED"];
const QUOTE_STATUSES = ["FEASIBILITY_CHECK", "QUOTED"];

const CONFIRM_TEXT: Record<Target, { title: string; description: string }> = {
  SOURCING: { title: "", description: "" },
  FEASIBILITY_CHECK: { title: "", description: "" },
  CONFIRMED: {
    title: "Confirm this mission?",
    description:
      "Confirm only when the operator and every feasibility check have verified the mission. The customer is told it is confirmed.",
  },
  COMPLETED: {
    title: "Mark this mission completed?",
    description: "The request closes and cannot move again.",
  },
  DECLINED: {
    title: "Decline this request?",
    description:
      "Use this when no feasible option exists. The request closes and cannot be reopened.",
  },
  CANCELLED: {
    title: "Cancel this request?",
    description: "The request closes and cannot be reopened.",
  },
};

/** Moves that ask first: closing ones and confirmation. */
const ASKS_FIRST: Target[] = [
  "CONFIRMED",
  "COMPLETED",
  "DECLINED",
  "CANCELLED",
];

/** A refused move, in operations' words (the shared wording is the operator's). */
function moveMessage(failure: unknown): string {
  if (failure instanceof ApiError) {
    if (failure.code === "OPERATOR_NOT_APPROVED") {
      return "The selected operator is no longer approved, so the mission cannot be confirmed. Decline or cancel the request.";
    }
    if (failure.code === "AIR_AMBULANCE_OPERATOR_NOT_ELIGIBLE") {
      return "The selected operator no longer has an approved air ambulance aircraft, so the mission cannot be confirmed. Decline or cancel the request.";
    }
  }
  return messageFor(failure);
}

function eventLabel(event: Request["events"][number]): string {
  const kind =
    event.payload && typeof event.payload.kind === "string"
      ? event.payload.kind
      : null;
  if (event.fromStatus === event.toStatus) {
    return kind === "ASSIGNMENT"
      ? "Owner changed"
      : kind === "FEASIBILITY"
        ? "Checklist recorded"
        : kind === "QUOTE"
          ? "Quote replaced"
          : "Updated";
  }
  return statusPresentation(event.toStatus).label;
}

/**
 * One request for operations (W4-6): assign, move, the feasibility
 * checklist, the quote and confirmation. Controls show only for the owner
 * or a super administrator, from the session read on the server; the API
 * decides. Medical details come only to the owner and the super
 * administrator, and each load is an audited read, so nothing is kept.
 */
export function AdminRequestDetail({
  reference,
  viewer,
}: {
  reference: string;
  viewer: { id: string; role: Role };
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [asking, setAsking] = useState<Target | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = queryKeys.adminAirAmbulanceRequest(reference);
  const path = `admin/air-ambulance/requests/${encodeURIComponent(reference)}`;

  const {
    data,
    isPending,
    isError,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: key,
    queryFn: () => apiFetch<Request>(path),
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  /** After any change, or a refusal saying the screen is stale: reload. */
  function settled(failure?: unknown) {
    if (
      !failure ||
      (failure instanceof ApiError &&
        (failure.status === 409 ||
          failure.status === 403 ||
          failure.status === 422))
    ) {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.adminAirAmbulanceListAll,
      });
    }
  }

  const assign = useMutation({
    mutationFn: () => apiFetch(`${path}/assign`, { method: "POST", body: {} }),
    onSuccess: () => {
      setError(null);
      toast({ title: "You own this request", tone: "success" });
    },
    onError: (failure) => setError(messageFor(failure)),
    onSettled: (_result, failure) => settled(failure ?? undefined),
  });

  const move = useMutation({
    mutationFn: (to: Target) =>
      apiFetch(`${path}/status`, {
        method: "PATCH",
        body: { status: to } satisfies Schemas["MoveAirAmbulanceDto"],
      }),
    onSuccess: (_result, to) => {
      setAsking(null);
      setError(null);
      toast({ title: statusPresentation(to).label, tone: "success" });
    },
    onError: (failure) => {
      setAsking(null);
      setError(moveMessage(failure));
    },
    onSettled: (_result, failure) => settled(failure ?? undefined),
  });

  if (isError && isNotFoundError(loadError)) {
    return (
      <RecordNotFound
        title="Request not found"
        description="This request does not exist, or the link is not correct."
        backHref="/admin/air-ambulance"
        backLabel="Back to air ambulance"
      />
    );
  }
  if (isError) {
    return (
      <>
        <h1 className="text-h2">Air ambulance request</h1>
        <div className="mt-6">
          <LoadError
            what="this request"
            error={loadError}
            onRetry={() => void refetch()}
          />
        </div>
      </>
    );
  }
  if (isPending) {
    return (
      <>
        <h1 className="text-h2">Air ambulance request</h1>
        <p role="status" className="sr-only">
          Loading the request
        </p>
        <Skeleton className="mt-6 h-96" />
      </>
    );
  }

  const request = data.data;
  const open = !CLOSED_STATUSES.includes(request.status);
  const mine = request.assignedToId === viewer.id;
  const canAct = open && (mine || viewer.role === "SUPER_ADMIN");
  const canTake =
    open &&
    !mine &&
    (request.assignedToId === null || viewer.role === "SUPER_ADMIN");
  const forward = FORWARD[request.status];
  const confirmBlocked =
    forward?.to === "CONFIRMED" && !request.feasibility?.complete;

  function choose(to: Target) {
    if (ASKS_FIRST.includes(to)) setAsking(to);
    else move.mutate(to);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/air-ambulance"
          className="text-body-sm text-accent hover:underline"
        >
          Air ambulance
        </Link>
        <h1 className="mt-2 text-h2 tabular-nums">{request.reference}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <AirAmbulanceStatusBadge status={request.status} />
          <span className="text-body-sm text-muted">
            Owner:{" "}
            {request.assignedToId === null
              ? "unassigned"
              : mine
                ? "you"
                : "another operations user"}
          </span>
        </div>
      </div>

      <FormAlert message={error} />

      {canTake || canAct ? (
        <Card className="flex flex-wrap items-center gap-3 p-4">
          {canTake ? (
            <Button loading={assign.isPending} onClick={() => assign.mutate()}>
              {request.assignedToId === null ? "Take request" : "Take over"}
            </Button>
          ) : null}
          {canAct && forward ? (
            <Button
              disabled={confirmBlocked || move.isPending}
              onClick={() => choose(forward.to)}
            >
              {forward.label}
            </Button>
          ) : null}
          {canAct ? (
            <>
              <Button
                variant="danger"
                disabled={move.isPending}
                onClick={() => choose("DECLINED")}
              >
                Decline
              </Button>
              <Button
                variant="destructive"
                disabled={move.isPending}
                onClick={() => choose("CANCELLED")}
              >
                Cancel request
              </Button>
            </>
          ) : null}
          {canAct && confirmBlocked ? (
            <p className="w-full text-body-sm text-muted">
              Confirming needs every feasibility check saved.
            </p>
          ) : null}
        </Card>
      ) : null}

      {request.quote ? (
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-title">Quote</h2>
          <PriceLabel
            amountMinor={request.quote.price.amountMinor}
            currency={request.quote.price.currency}
            priceType={request.quote.price.priceType}
          />
          <p className="text-body-sm text-muted">
            Operator: {request.quote.operatorName ?? "Unknown"}, sent{" "}
            {formatDateTime(request.quote.quotedAt)}
          </p>
          <p className="max-w-reading text-body-sm whitespace-pre-wrap">
            {request.quote.conditions}
          </p>
        </Card>
      ) : null}

      {canAct && QUOTE_STATUSES.includes(request.status) ? (
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-title">
            {request.status === "QUOTED" ? "Replace the quote" : "Send a quote"}
          </h2>
          <QuoteForm
            path={path}
            revising={request.status === "QUOTED"}
            onSent={settled}
          />
        </Card>
      ) : null}

      {FEASIBILITY_STATUSES.includes(request.status) || request.feasibility ? (
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-title">Feasibility</h2>
          <FeasibilityForm
            // Remounted when the saved checklist changes.
            key={JSON.stringify(request.feasibility)}
            path={path}
            state={request.feasibility}
            editable={canAct && FEASIBILITY_STATUSES.includes(request.status)}
            onSaved={settled}
          />
        </Card>
      ) : null}

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-title">Request</h2>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-body-sm text-muted">Route</dt>
            <dd>
              {request.originName ?? "Unknown"} to{" "}
              {request.destinationName ?? "unknown"}
            </dd>
          </div>
          <div>
            <dt className="text-body-sm text-muted">Preferred time</dt>
            <dd>{formatDateTime(request.preferredAt)}</dd>
          </div>
          <div>
            <dt className="text-body-sm text-muted">Travelling</dt>
            <dd>
              {request.patientCount} patient(s), {request.accompanyingPersons}{" "}
              with them
            </dd>
          </div>
          <div>
            <dt className="text-body-sm text-muted">Contact</dt>
            <dd className="break-words">
              {request.contactName}, {request.contactPhone}
              {request.contactEmail ? `, ${request.contactEmail}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-body-sm text-muted">Second contact</dt>
            <dd className="break-words">
              {request.emergencyContactName || request.emergencyContactPhone
                ? [request.emergencyContactName, request.emergencyContactPhone]
                    .filter(Boolean)
                    .join(", ")
                : "Not given"}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-title">Medical details</h2>
        {request.medical ? (
          <>
            <dl className="grid gap-4 sm:grid-cols-2">
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
            </dl>
            <MedicalDetails medical={request.medical} />
          </>
        ) : (
          <p className="text-body-sm text-muted">
            Shown only to the request&apos;s owner and super administrators.
            Take the request to see them.
          </p>
        )}
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-title">Timeline</h2>
        <ol aria-label="Timeline" className="flex flex-col gap-2">
          {request.events.map((event, index) => (
            <li
              key={`${event.at}-${index}`}
              className="flex flex-wrap items-baseline gap-x-3 text-body-sm"
            >
              <span className="font-medium">{eventLabel(event)}</span>
              <span className="text-muted">
                {formatDateTime(event.at)}
                {event.actorRole ? `, ${roleLabel(event.actorRole)}` : ""}
              </span>
              {event.payload &&
              typeof event.payload.revisionReason === "string" ? (
                <span className="w-full text-muted">
                  Reason: {event.payload.revisionReason}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </Card>

      {asking ? (
        <ConfirmDialog
          open
          onOpenChange={(next) => !next && setAsking(null)}
          title={CONFIRM_TEXT[asking].title}
          description={CONFIRM_TEXT[asking].description}
          confirmLabel={
            asking === "CONFIRMED"
              ? "Confirm mission"
              : asking === "COMPLETED"
                ? "Mark completed"
                : asking === "DECLINED"
                  ? "Decline request"
                  : "Cancel request"
          }
          destructive={asking === "DECLINED" || asking === "CANCELLED"}
          loading={move.isPending}
          onConfirm={() => move.mutate(asking)}
        />
      ) : null}
    </div>
  );
}
