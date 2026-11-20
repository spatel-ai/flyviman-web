"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { StatusBadge } from "@/components/shared/status-badge";
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
import { listAdminPayments } from "@/lib/api/payments";
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
];

/** Every payment attempt, newest first, filtered by status (finance). */
export function PaymentsList() {
  const router = useRouter();
  const filter = parsePaymentFilter(useSearchParams());
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
