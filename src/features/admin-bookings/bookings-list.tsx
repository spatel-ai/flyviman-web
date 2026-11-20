"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import {
  bookingListQuery,
  CATEGORY_OPTIONS,
  categoryName,
  DEFAULT_FILTER,
  isFiltered,
  PAGE_SIZE,
  parseBookingFilter,
  PAYMENT_OPTIONS,
  SEARCH_MAX_LENGTH,
  serialiseBookingFilter,
  STATUS_OPTIONS,
  type BookingFilter,
} from "./filters";

type Booking = Schemas["AdminBookingSummaryDto"];

const COLUMNS = [
  "Reference",
  "Trip",
  "Departs",
  "Customer",
  "Status",
  "Payment",
  "Price",
];

function Price({ booking }: { booking: Booking }) {
  return booking.price ? (
    <PriceLabel
      amountMinor={booking.price.amountMinor}
      currency={booking.price.currency}
      priceType={booking.price.priceType}
      variant="compact"
      className="items-start"
    />
  ) : (
    <span className="text-muted">Price on request</span>
  );
}

export function BookingsList() {
  const router = useRouter();
  const filter = parseBookingFilter(useSearchParams());

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.adminBookings(filter),
    queryFn: () =>
      apiFetch<Booking[]>("admin/bookings", {
        query: bookingListQuery(filter),
      }),
  });

  // The view lives in the URL, so it can be shared and returned to.
  function show(next: BookingFilter) {
    const search = serialiseBookingFilter(next);
    router.replace(search ? `/admin/bookings?${search}` : "/admin/bookings", {
      scroll: false,
    });
  }

  const rows = data?.data ?? [];

  return (
    <div className="mt-6 flex flex-col gap-6">
      <SearchBox
        key={filter.q}
        initial={filter.q}
        onSearch={(q) => show({ ...filter, q, page: 1 })}
      />
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={filter.status}
          onValueChange={(status) =>
            show({
              ...filter,
              status: status as BookingFilter["status"],
              page: 1,
            })
          }
          className="h-10 w-52 max-w-full"
        />
        <Select
          label="Payment"
          options={PAYMENT_OPTIONS}
          value={filter.paymentStatus}
          onValueChange={(paymentStatus) =>
            show({
              ...filter,
              paymentStatus: paymentStatus as BookingFilter["paymentStatus"],
              page: 1,
            })
          }
          className="h-10 w-44 max-w-full"
        />
        <Select
          label="Category"
          options={CATEGORY_OPTIONS}
          value={filter.category}
          onValueChange={(category) =>
            show({
              ...filter,
              category: category as BookingFilter["category"],
              page: 1,
            })
          }
          className="h-10 w-48 max-w-full"
        />
        <Input
          label="Requested from"
          type="date"
          value={filter.from}
          max={filter.to || undefined}
          onChange={(event) =>
            show({ ...filter, from: event.target.value, page: 1 })
          }
          className="h-10 w-44 max-w-full"
        />
        <Input
          label="Requested to"
          type="date"
          value={filter.to}
          min={filter.from || undefined}
          onChange={(event) =>
            show({ ...filter, to: event.target.value, page: 1 })
          }
          className="h-10 w-44 max-w-full"
        />
      </div>

      {isError ? (
        <LoadError
          what="the bookings"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : !isPending && rows.length === 0 ? (
        <EmptyState
          title={
            isFiltered(filter)
              ? "No bookings match these filters"
              : "No bookings yet"
          }
          description={
            isFiltered(filter)
              ? "Change the search or the filters to see more."
              : "Bookings appear here as customers request them."
          }
          action={
            isFiltered(filter) ? (
              <Button
                variant="secondary"
                className="h-10"
                onClick={() => show(DEFAULT_FILTER)}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div aria-busy={isPending || undefined}>
            {isPending ? (
              <p role="status" className="sr-only">
                Loading bookings
              </p>
            ) : null}
            {isPending ? (
              <Skeleton className="h-64" />
            ) : (
              <>
                <div className="hidden md:block">
                  <Table aria-label="Bookings">
                    <TableHead>
                      <TableRow>
                        {COLUMNS.map((column) => (
                          <TableHeaderCell key={column}>
                            {column}
                          </TableHeaderCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.reference}>
                          <TableCell className="whitespace-nowrap">
                            <Link
                              href={`/admin/bookings/${row.reference}`}
                              className="font-medium text-accent hover:underline"
                            >
                              {row.reference}
                            </Link>
                            <span className="block text-caption text-muted">
                              {categoryName(row.category)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {row.originName} to {row.destinationName}
                            <span className="block text-caption text-muted">
                              {row.operator?.name ?? "No operator yet"}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDateTime(row.departureAt)}
                          </TableCell>
                          <TableCell className="break-all">
                            {row.customer.email ?? row.customer.phone ?? "-"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <StatusBadge kind="booking" status={row.status} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <StatusBadge
                              kind="payment"
                              status={row.paymentStatus}
                            />
                          </TableCell>
                          <TableCell>
                            <Price booking={row} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ul className="flex flex-col gap-3 md:hidden">
                  {rows.map((row) => (
                    <li key={row.reference}>
                      <Card className="flex flex-col gap-3 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Link
                            href={`/admin/bookings/${row.reference}`}
                            className="font-medium text-accent hover:underline"
                          >
                            {row.reference}
                          </Link>
                          <span className="text-caption text-muted">
                            {categoryName(row.category)}
                          </span>
                        </div>
                        <p className="text-body-sm">
                          {row.originName} to {row.destinationName}
                          <span className="block text-muted">
                            Departs {formatDateTime(row.departureAt)}
                          </span>
                        </p>
                        <p className="break-all text-body-sm text-muted">
                          {row.customer.email ?? row.customer.phone ?? "-"}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge kind="booking" status={row.status} />
                          <StatusBadge
                            kind="payment"
                            status={row.paymentStatus}
                          />
                        </div>
                        <Price booking={row} />
                      </Card>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
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

/** The search applies on Enter or the button, not on every key. */
function SearchBox({
  initial,
  onSearch,
}: {
  initial: string;
  onSearch: (q: string) => void;
}) {
  const [text, setText] = useState(initial);
  return (
    <form
      role="search"
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(text.trim());
      }}
    >
      <Input
        label="Search"
        hint="A booking reference, or the customer's exact email or phone number."
        value={text}
        maxLength={SEARCH_MAX_LENGTH}
        onChange={(event) => setText(event.target.value)}
        className="h-10 w-96 max-w-full"
      />
      <Button type="submit" className="mb-6 h-10">
        Search
      </Button>
    </form>
  );
}
