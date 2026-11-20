"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { FormAlert } from "@/components/shared/form-alert";
import { LoadError } from "@/components/shared/load-error";
import { StatusBadge } from "@/components/shared/status-badge";
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
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";
import {
  listRefundsDue,
  startRefund,
  type RefundDue,
} from "@/lib/api/payments";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDateTime } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { useAttemptKey } from "@/lib/idempotency";
import { PAGE_SIZE } from "./filters";

const COLUMNS = [
  "Due since",
  "Booking",
  "Payment",
  "Refund owed",
  "Status",
  "",
];

/** Statuses from which a refund can still be started. */
const STARTABLE = new Set(["REFUND_DUE"]);

/**
 * Refunds finance owes, oldest first. Starting one moves money, so it asks
 * for a reason and a confirmation, and sends an Idempotency-Key.
 */
export function RefundsQueue() {
  const [page, setPage] = useState(1);
  const [chosen, setChosen] = useState<RefundDue | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const attempt = useAttemptKey();

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.adminRefunds(page),
    queryFn: () => listRefundsDue(page, PAGE_SIZE),
  });

  const refund = useMutation({
    mutationFn: ({ due, reason }: { due: RefundDue; reason: string }) => {
      const input = {
        amountMinor: due.amountMinor,
        currency: due.currency,
        reason,
      };
      return startRefund(
        due.paymentReference,
        input,
        attempt.keyFor({ payment: due.paymentReference, ...input }),
      );
    },
    onSuccess: (_, { due }) => {
      attempt.rotate();
      setChosen(null);
      toast({
        title: "Refund started",
        description: `${formatMoney(due.amountMinor, due.currency)} for ${due.bookingReference}.`,
        tone: "success",
      });
    },
    onError: (failed) => {
      if (!(failed instanceof ApiError && failed.status === 0)) {
        attempt.rotate();
      }
      setChosen(null);
      setFailure(messageFor(failed));
    },
    // The queue changed either way, or someone else acted on it first.
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "refunds"] }),
  });

  const rows = data?.data ?? [];

  return (
    <div className="mt-6 flex flex-col gap-6">
      <FormAlert message={failure} />
      {isError ? (
        <LoadError
          what="the refunds"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : !isPending && rows.length === 0 ? (
        <EmptyState
          title="No refunds due"
          description="Refunds owed after a cancellation appear here."
        />
      ) : (
        <>
          <Table aria-busy={isPending || undefined}>
            <TableHead>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHeaderCell key={column || "action"}>
                    {column ? column : <span className="sr-only">Action</span>}
                  </TableHeaderCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isPending
                ? [0, 1, 2].map((row) => (
                    <TableRow key={row}>
                      {COLUMNS.map((column) => (
                        <TableCell key={column || "action"}>
                          <Skeleton className="h-5 w-24" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : rows.map((row) => (
                    <TableRow key={row.paymentReference}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(row.dueSince)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {row.bookingReference}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {row.paymentReference}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {formatMoney(row.amountMinor, row.currency)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <StatusBadge kind="payment" status={row.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {STARTABLE.has(row.status) ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            aria-label={`Start refund for ${row.bookingReference}`}
                            onClick={() => {
                              setFailure(null);
                              setChosen(row);
                            }}
                          >
                            Start refund
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
          {isPending ? null : (
            <Pagination
              page={page}
              pageSize={data.meta.pageSize ?? PAGE_SIZE}
              total={data.meta.total ?? 0}
              onPageChange={setPage}
            />
          )}
        </>
      )}
      <ConfirmDialog
        open={chosen !== null}
        onOpenChange={(open) => {
          if (!open && !refund.isPending) setChosen(null);
        }}
        title="Start this refund?"
        description={
          chosen
            ? `${formatMoney(chosen.amountMinor, chosen.currency)} goes back to the customer's original payment method for ${chosen.bookingReference}, through the payment provider. This cannot be undone.`
            : ""
        }
        confirmLabel="Start refund"
        requireReason
        loading={refund.isPending}
        onConfirm={(reason) => {
          if (chosen && reason) refund.mutate({ due: chosen, reason });
        }}
      />
    </div>
  );
}
