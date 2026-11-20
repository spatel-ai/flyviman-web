"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDateTime } from "@/lib/format/date";
import { NewPromotionDialog } from "./promotion-dialog";
import {
  describeOffer,
  describeScope,
  describeUses,
  statusLabel,
  type Promotion,
} from "./schema";

const PAGE_SIZE = 50;
const VIEWS = ["ACTIVE", "SCHEDULED", "ENDED", "ALL"] as const;
type View = (typeof VIEWS)[number];

const TONES: Record<string, Tone> = {
  ACTIVE: "success",
  SCHEDULED: "info",
  ENDED: "neutral",
};

const COLUMNS = ["Code", "Offer", "Applies to", "Valid", "Uses", "Status", ""];

/** Finance's promotion codes: list by status, create, end early. */
export function PromotionsList() {
  const router = useRouter();
  const params = useSearchParams();
  const asked = params.get("status")?.toUpperCase();
  const view: View = VIEWS.includes(asked as View) ? (asked as View) : "ACTIVE";
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const [ending, setEnding] = useState<Promotion | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.adminPromotions({ view, page }),
    queryFn: () =>
      apiFetch<Promotion[]>("admin/promotions", {
        query: {
          ...(view === "ALL" ? {} : { status: view }),
          page,
          pageSize: PAGE_SIZE,
        },
      }),
  });

  const end = useMutation({
    mutationFn: ({
      promotion,
      reason,
    }: {
      promotion: Promotion;
      reason: string;
    }) =>
      apiFetch<Promotion>(`admin/promotions/${promotion.id}/end`, {
        method: "POST",
        body: { reason },
      }),
    onSuccess: (_, { promotion }) => {
      toast({
        title: `Promotion ${promotion.code} ended`,
        description:
          "The code no longer applies. Bookings made with it keep their price.",
        tone: "success",
      });
      setEnding(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.adminPromotionsAll,
      });
    },
    onError: (failure) => {
      toast({ title: messageFor(failure), tone: "danger" });
      if (
        failure instanceof ApiError &&
        (failure.code === "PROMOTION_ENDED" || failure.code === "NOT_FOUND")
      ) {
        setEnding(null);
        void queryClient.invalidateQueries({
          queryKey: queryKeys.adminPromotionsAll,
        });
      }
    },
  });

  function show(next: { view: View; page: number }) {
    const search = new URLSearchParams();
    if (next.view !== "ACTIVE") search.set("status", next.view.toLowerCase());
    if (next.page > 1) search.set("page", String(next.page));
    const query = search.toString();
    router.replace(query ? `/admin/promotions?${query}` : "/admin/promotions", {
      scroll: false,
    });
  }

  if (isError && error instanceof ApiError && error.code === "FORBIDDEN") {
    return <ManagedByFinanceNote />;
  }

  const promotions = data?.data ?? [];

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Tabs
          value={view}
          onValueChange={(next) => show({ view: next as View, page: 1 })}
        >
          <TabsList aria-label="Which promotions">
            <TabsTrigger value="ACTIVE">Active</TabsTrigger>
            <TabsTrigger value="SCHEDULED">Scheduled</TabsTrigger>
            <TabsTrigger value="ENDED">Ended</TabsTrigger>
            <TabsTrigger value="ALL">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <NewPromotionDialog />
      </div>

      {isError ? (
        <LoadError
          what="the promotions"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : !isPending && promotions.length === 0 ? (
        <EmptyState
          title="No promotions here"
          description="Create a code to offer customers a discount that Flyviman funds."
        />
      ) : (
        <>
          <div aria-busy={isPending || undefined}>
            {isPending ? (
              <p role="status" className="sr-only">
                Loading promotions
              </p>
            ) : null}
            <Table>
              <TableHead>
                <TableRow>
                  {COLUMNS.map((column) => (
                    <TableHeaderCell key={column || "actions"}>
                      {column}
                    </TableHeaderCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {isPending
                  ? Array.from({ length: 4 }, (_, index) => (
                      <TableRow key={index}>
                        {COLUMNS.map((column) => (
                          <TableCell key={column || "actions"}>
                            <Skeleton className="h-5 w-24" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : promotions.map((promotion) => (
                      <TableRow key={promotion.id}>
                        <TableCell>
                          <span className="font-medium tabular-nums">
                            {promotion.code}
                          </span>
                          <span className="block text-caption text-muted">
                            {promotion.name}
                          </span>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {describeOffer(promotion)}
                        </TableCell>
                        <TableCell>{describeScope(promotion)}</TableCell>
                        <TableCell className="text-body-sm">
                          {formatDateTime(promotion.startsAt)}
                          <span className="block text-muted">
                            to{" "}
                            {formatDateTime(
                              promotion.endedAt ?? promotion.endsAt,
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {describeUses(promotion)}
                        </TableCell>
                        <TableCell>
                          <Badge tone={TONES[promotion.status] ?? "neutral"}>
                            {statusLabel(promotion.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {promotion.endable ? (
                            <Button
                              variant="ghost"
                              className="h-10"
                              onClick={() => setEnding(promotion)}
                              aria-label={`End promotion ${promotion.code}`}
                            >
                              End
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={data?.meta.total ?? 0}
            onPageChange={(next) => show({ view, page: next })}
          />
        </>
      )}

      <ConfirmDialog
        open={ending !== null}
        onOpenChange={(open) => {
          if (!open) setEnding(null);
        }}
        title={ending ? `End promotion ${ending.code}?` : "End promotion?"}
        description="The code stops working at once and cannot be started again. Bookings already made with it keep their price."
        confirmLabel="End promotion"
        destructive
        requireReason
        loading={end.isPending}
        onConfirm={(reason) => {
          if (ending) end.mutate({ promotion: ending, reason: reason ?? "" });
        }}
      />
    </div>
  );
}

/** What operations see here: promotions are finance's (security-rbac.md). */
export function ManagedByFinanceNote() {
  return (
    <p className="mt-6 max-w-reading text-body text-muted">
      Promotions are managed by finance.
    </p>
  );
}
