"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { Badge, type Tone } from "@/components/ui/badge";
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
import { listOperatorSettlements } from "@/lib/api/payments";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDateTime } from "@/lib/format/date";

const PAGE_SIZE = 20;

const STATUS: Record<string, { label: string; tone: Tone }> = {
  NOT_DUE: { label: "Not due yet", tone: "neutral" },
  DUE: { label: "Due", tone: "warning" },
  ON_HOLD: { label: "On hold", tone: "danger" },
  PAID: { label: "Paid", tone: "success" },
};

const COLUMNS = ["Created", "Booking", "Payable to you", "Status", "Payout"];

/** What Flyviman owes the organisation per completed booking, newest first. */
export function OperatorSettlementsList() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.operatorSettlements(page),
    queryFn: () => listOperatorSettlements(page, PAGE_SIZE),
  });
  const rows = data?.data ?? [];

  if (isError) {
    return (
      <LoadError
        what="your settlements"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }
  if (!isPending && rows.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          title="No settlements yet"
          description="A settlement appears after a trip you flew for a Flyviman booking is completed."
        />
      </div>
    );
  }
  return (
    <div className="mt-6 flex flex-col gap-6">
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
            : rows.map((row) => {
                const status = STATUS[row.status];
                return (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(row.createdAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.bookingReference}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <PriceLabel
                        amountMinor={row.payableMinor}
                        currency={row.currency}
                        priceType="CONFIRMED"
                        variant="compact"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge tone={status?.tone ?? "neutral"}>
                        {status?.label ?? row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.paidAt ? (
                        <span className="flex flex-col">
                          {row.paymentReference}
                          <span className="text-body-sm text-muted">
                            {formatDateTime(row.paidAt)}
                          </span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
        </TableBody>
      </Table>
      {isPending || !data ? null : (
        <Pagination
          page={page}
          pageSize={data.meta.pageSize ?? PAGE_SIZE}
          total={data.meta.total ?? 0}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
