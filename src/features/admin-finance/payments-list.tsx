"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
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
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";
import { listAdminPayments, resolvePaymentFlag } from "@/lib/api/payments";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDateTime } from "@/lib/format/date";
import {
  PAGE_SIZE,
  PAYMENT_STATUS_OPTIONS,
  parsePaymentFilter,
  purposeLabel,
  serialisePaymentFilter,
  type PaymentListFilter,
  type PaymentStatusFilter,
} from "./filters";

const COLUMNS = [
  "Created",
  "Payment",
  "Booking",
  "Purpose",
  "Amount",
  "Status",
  "Review",
];

/** Every payment attempt, newest first, filtered by status (finance). */
export function PaymentsList() {
  const router = useRouter();
  const filter = parsePaymentFilter(useSearchParams());
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolvePending, setResolvePending] = useState(false);

  async function resolve(reason?: string) {
    if (!resolving || !reason) return;
    setResolvePending(true);
    setResolveError(null);
    try {
      await resolvePaymentFlag(resolving, reason);
      toast({ title: "Flag resolved", tone: "success" });
      setResolving(null);
    } catch (failure) {
      if (
        failure instanceof ApiError &&
        failure.code === "PAYMENT_FLAG_NOT_OPEN"
      ) {
        toast({ title: messageFor(failure), tone: "danger" });
        setResolving(null);
      } else {
        setResolveError(messageFor(failure));
      }
    } finally {
      setResolvePending(false);
      void queryClient.invalidateQueries({ queryKey: ["admin", "payments"] });
    }
  }
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.adminPayments(filter),
    queryFn: () =>
      listAdminPayments({
        status: filter.status === "ALL" ? undefined : filter.status,
        page: filter.page,
        pageSize: PAGE_SIZE,
      }),
  });

  function show(next: PaymentListFilter) {
    const search = serialisePaymentFilter(next);
    router.replace(search ? `/admin/payments?${search}` : "/admin/payments", {
      scroll: false,
    });
  }

  const rows = data?.data ?? [];

  return (
    <div className="mt-6 flex flex-col gap-6">
      <Select
        label="Status"
        options={[...PAYMENT_STATUS_OPTIONS]}
        value={filter.status}
        onValueChange={(status) =>
          show({ status: status as PaymentStatusFilter, page: 1 })
        }
        className="h-10 w-56 max-w-full"
      />
      <ConfirmDialog
        open={resolving !== null}
        onOpenChange={(open) => {
          if (!open) setResolving(null);
        }}
        title={`Resolve flag on ${resolving ?? ""}`}
        description={
          resolveError ??
          "Confirm the amount was checked at the gateway and any money owed back was refunded. This moves no money. The reason is kept in the audit record."
        }
        confirmLabel="Resolve flag"
        requireReason
        loading={resolvePending}
        onConfirm={(reason) => void resolve(reason)}
      />
      {isError ? (
        <LoadError
          what="the payments"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : !isPending && rows.length === 0 ? (
        <EmptyState
          title={
            filter.status === "ALL"
              ? "No payments yet"
              : "No payments with this status"
          }
        />
      ) : (
        <>
          <Table aria-busy={isPending || undefined}>
            <TableHead>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHeaderCell key={column}>{column}</TableHeaderCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isPending
                ? [0, 1, 2].map((row) => (
                    <TableRow key={row}>
                      {COLUMNS.map((column) => (
                        <TableCell key={column}>
                          <Skeleton className="h-5 w-24" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : rows.map((row) => (
                    <TableRow key={row.reference}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(row.createdAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {row.reference}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {row.bookingReference}
                      </TableCell>
                      <TableCell>{purposeLabel(row.purpose)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <PriceLabel
                          amountMinor={row.price.amountMinor}
                          currency={row.price.currency}
                          priceType={row.price.priceType}
                          variant="compact"
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <StatusBadge kind="payment" status={row.status} />
                      </TableCell>
                      <TableCell>
                        {row.reviewReason && row.reviewResolvedAt ? (
                          <span className="text-body-sm text-muted">
                            Resolved {formatDateTime(row.reviewResolvedAt)}
                          </span>
                        ) : row.reviewReason === "AMOUNT_MISMATCH" ||
                          row.reviewReason === "DUPLICATE_CAPTURE" ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setResolveError(null);
                              setResolving(row.reference);
                            }}
                          >
                            Resolve flag
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
          {isPending ? null : (
            <Pagination
              page={filter.page}
              pageSize={data.meta.pageSize ?? PAGE_SIZE}
              total={data.meta.total ?? 0}
              onPageChange={(page) => show({ ...filter, page })}
            />
          )}
        </>
      )}
    </div>
  );
}
