"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { RecordNotFound } from "@/components/shared/record-not-found";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  aircraftLabel,
  routeLabel,
  validUntilLabel,
  windowLabel,
} from "@/lib/empty-legs/format";
import type { OperatorEmptyLeg } from "@/lib/empty-legs/types";
import { apiFetch } from "@/lib/api/client";
import { isNotFoundError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { OfferForm } from "./offer-form";
import { fromOffer } from "./schema";

type Location = Schemas["LocationResponseDto"];

export function OfferEditor({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `operator/empty-legs/${encodeURIComponent(id)}`;
  const offer = useQuery({
    queryKey: queryKeys.operatorEmptyLeg(id),
    queryFn: () => apiFetch<OperatorEmptyLeg>(base),
  });
  const originId = offer.data?.data.origin.id;
  const origin = useQuery({
    queryKey: queryKeys.location(originId ?? ""),
    queryFn: () =>
      apiFetch<Location>(`locations/${encodeURIComponent(originId ?? "")}`),
    enabled: Boolean(originId),
  });

  const act = useMutation({
    mutationFn: (action: "publish" | "withdraw") =>
      apiFetch<OperatorEmptyLeg>(`${base}/${action}`, { method: "POST" }),
    onSuccess: async ({ data }, action) => {
      setConfirmWithdraw(false);
      setError(null);
      toast({
        title:
          action === "withdraw"
            ? "Offer withdrawn"
            : data.status === "PENDING_REVIEW"
              ? "Sent for review. Customers see it once it is approved."
              : "Offer published",
        tone: "success",
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.operatorEmptyLegs,
      });
    },
    onError: (failure) => {
      setConfirmWithdraw(false);
      setError(messageFor(failure));
    },
  });

  if (offer.isPending) return <Skeleton className="h-64" />;
  if (offer.isError) {
    return isNotFoundError(offer.error) ? (
      <RecordNotFound
        title="Offer not found"
        description="This offer does not exist, or the link is not correct."
        backHref="/operator/empty-legs"
        backLabel="Back to empty legs"
      />
    ) : (
      <LoadError
        what="this offer"
        error={offer.error}
        onRetry={() => void offer.refetch()}
      />
    );
  }
  const item = offer.data.data;
  const editable = item.editable;
  const zone = item.origin.timeZone ?? origin.data?.data.timeZone;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/operator/empty-legs"
          className="text-body-sm text-accent hover:underline"
        >
          Empty legs
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-h2">{routeLabel(item)}</h1>
          <StatusBadge kind="emptyLeg" status={item.status} />
        </div>
        <p className="mt-2 text-muted">{item.reference}</p>
      </div>
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
      {item.hasLiveRequest ? (
        <Card variant="raised" role="status">
          <p className="text-body-sm font-medium">
            A customer has requested this offer
          </p>
          <p className="text-body-sm">
            Its price and departure window are fixed, and it cannot be
            withdrawn, until you answer the request.{" "}
            <Link
              href="/operator/requests"
              className="text-accent hover:underline"
            >
              Go to requests
            </Link>
          </p>
        </Card>
      ) : null}
      {item.reviewNote ? (
        <Card variant="raised">
          <p className="text-body-sm font-medium">Why it was not approved</p>
          <p className="text-body-sm">{item.reviewNote}</p>
        </Card>
      ) : null}
      {editable ? (
        zone ? (
          <OfferForm
            key={`${item.id}-${item.status}`}
            offer={item}
            initial={fromOffer(item, zone)}
          />
        ) : origin.isError ? (
          <LoadError
            what="the departure airport"
            error={origin.error}
            onRetry={() => void origin.refetch()}
          />
        ) : (
          <Skeleton className="h-64" />
        )
      ) : (
        <Card variant="raised" className="flex flex-col gap-3">
          <p>{aircraftLabel(item)}</p>
          <p className="text-body-sm">{windowLabel(item)}</p>
          <p className="text-body-sm text-muted">
            {item.seatsAvailable} seats · {validUntilLabel(item)}
          </p>
          <PriceLabel
            amountMinor={item.price.amountMinor}
            currency={item.price.currency}
            priceType={item.price.priceType}
          />
          <p className="whitespace-pre-line text-body-sm text-muted">
            {item.conditions}
          </p>
        </Card>
      )}
      <div className="flex flex-wrap gap-3">
        {item.publishable ? (
          <Button
            onClick={() => act.mutate("publish")}
            loading={act.isPending && act.variables === "publish"}
          >
            Publish
          </Button>
        ) : null}
        {item.withdrawable ? (
          <Button variant="secondary" onClick={() => setConfirmWithdraw(true)}>
            Withdraw
          </Button>
        ) : null}
      </div>
      {item.publishable ? (
        <p className="text-body-sm text-muted">
          Save your changes before publishing. Publishing may send the offer to
          operations for review first.
        </p>
      ) : null}
      <ConfirmDialog
        open={confirmWithdraw}
        onOpenChange={setConfirmWithdraw}
        title="Withdraw this offer"
        description="Customers can no longer see or ask about it. You can add a new offer for the flight later."
        confirmLabel="Withdraw offer"
        destructive
        loading={act.isPending && act.variables === "withdraw"}
        onConfirm={() => act.mutate("withdraw")}
      />
    </div>
  );
}
