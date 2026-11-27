"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { PriceLabel } from "@/components/shared/price-label";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, RouteText, TruncatedText } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import {
  aircraftLabel,
  placeLabel,
  validUntilLabel,
  windowLabel,
} from "@/lib/empty-legs/format";
import type { AdminEmptyLeg } from "@/lib/empty-legs/types";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";

const TABS = [
  { value: "PENDING_REVIEW", label: "Awaiting review" },
  { value: "PUBLISHED", label: "Published" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

const PAGE_SIZE = 20;

/** Offers awaiting operations' review, and the ones already decided. */
export function EmptyLegsQueue() {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("status");
  const status = TABS.some((tab) => tab.value === requested)
    ? (requested as string)
    : "PENDING_REVIEW";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [rejecting, setRejecting] = useState<AdminEmptyLeg | null>(null);
  const [error, setError] = useState<string | null>(null);

  const queue = useQuery({
    queryKey: [...queryKeys.adminEmptyLegs(status), page] as const,
    queryFn: () =>
      apiFetch<AdminEmptyLeg[]>("admin/empty-legs", {
        query: { status, page, pageSize: PAGE_SIZE },
      }),
  });

  const decide = useMutation({
    mutationFn: (input: {
      id: string;
      action: "approve" | "reject";
      reason?: string;
    }) =>
      apiFetch(
        `admin/empty-legs/${encodeURIComponent(input.id)}/${input.action}`,
        {
          method: "POST",
          body:
            input.action === "reject" ? { reason: input.reason } : undefined,
        },
      ),
    onSuccess: async (_result, input) => {
      setRejecting(null);
      setError(null);
      toast({
        title: input.action === "approve" ? "Offer approved" : "Offer rejected",
        tone: "success",
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.adminEmptyLegsAll,
      });
    },
    onError: (failure) => {
      setRejecting(null);
      setError(messageFor(failure));
    },
  });

  return (
    <Tabs
      value={status}
      onValueChange={(next) =>
        router.replace(`/admin/empty-legs?status=${next}`)
      }
      className="mt-6"
    >
      <TabsList aria-label="Offer status">
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={status}>
        {error ? (
          <p role="alert" className="mb-4 text-danger">
            {error}
          </p>
        ) : null}
        {queue.isPending ? (
          <Skeleton className="h-40" />
        ) : queue.isError ? (
          <p role="alert" className="text-danger">
            {messageFor(queue.error)}
          </p>
        ) : queue.data.data.length === 0 ? (
          <EmptyState
            title="Nothing in this list"
            description="Offers appear here when an operator submits them."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {queue.data.data.map((item) => (
              <li key={item.id}>
                <Card variant="raised" className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <RouteText
                        className="text-title"
                        origin={placeLabel(item.origin)}
                        destination={placeLabel(item.destination)}
                      />
                      <TruncatedText
                        title={`${item.reference} · ${item.operatorName} · ${item.aircraft.registration} · ${aircraftLabel(item)}`}
                        className="text-body-sm text-muted"
                      >
                        {item.reference} · {item.operatorName} ·{" "}
                        {item.aircraft.registration} · {aircraftLabel(item)}
                      </TruncatedText>
                      <p className="text-body-sm">{windowLabel(item)}</p>
                      <p className="text-body-sm text-muted">
                        {item.seatsAvailable} seats · {validUntilLabel(item)}
                      </p>
                    </div>
                    <div className="flex items-start gap-4">
                      <PriceLabel
                        amountMinor={item.price.amountMinor}
                        currency={item.price.currency}
                        priceType={item.price.priceType}
                        variant="compact"
                      />
                      <StatusBadge kind="emptyLeg" status={item.status} />
                    </div>
                  </div>
                  <p className="whitespace-pre-line text-body-sm text-muted">
                    {item.conditions}
                  </p>
                  {item.reviewNote ? (
                    <p className="text-body-sm">Reason: {item.reviewNote}</p>
                  ) : null}
                  {item.status === "PENDING_REVIEW" ? (
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() =>
                          decide.mutate({ id: item.id, action: "approve" })
                        }
                        loading={
                          decide.isPending &&
                          decide.variables.id === item.id &&
                          decide.variables.action === "approve"
                        }
                        disabled={decide.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        disabled={decide.isPending}
                        onClick={() => setRejecting(item)}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        )}
        {queue.data && queue.data.data.length > 0 ? (
          <Pagination
            className="mt-4"
            page={page}
            pageSize={queue.data.meta.pageSize ?? PAGE_SIZE}
            total={queue.data.meta.total ?? queue.data.data.length}
            onPageChange={(next) =>
              router.replace(`/admin/empty-legs?status=${status}&page=${next}`)
            }
          />
        ) : null}
      </TabsContent>
      <ConfirmDialog
        open={rejecting !== null}
        onOpenChange={(open) => {
          if (!open) setRejecting(null);
        }}
        title="Reject this offer"
        description="The operator sees the reason and can change the offer and send it again."
        confirmLabel="Reject offer"
        destructive
        requireReason
        loading={decide.isPending}
        onConfirm={(reason) => {
          if (rejecting) {
            decide.mutate({ id: rejecting.id, action: "reject", reason });
          }
        }}
      />
    </Tabs>
  );
}
