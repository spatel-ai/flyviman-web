"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { sortByDeparture } from "@/lib/sort/departure-order";
import {
  type BookingFilter,
  DEFAULT_FILTER,
  isFiltered,
  listQuery,
  PAGE_SIZE,
  parseFilter,
  serialiseFilter,
  STATUS_OPTIONS,
} from "./filters";

type Row = Schemas["OperatorBookingSummaryDto"];
type Summary = Schemas["AircraftSummaryResponseDto"];

export function BookingsList() {
  const router = useRouter();
  const filter = parseFilter(useSearchParams());

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.operatorBookings(filter),
    queryFn: () =>
      apiFetch<Row[]>("operator/bookings", { query: listQuery(filter) }),
  });
  const fleet = useQuery({
    queryKey: queryKeys.operatorAircraftAll,
    queryFn: () =>
      apiFetch<Summary[]>("operator/aircraft", { query: { pageSize: 100 } }),
  });

  function show(next: BookingFilter) {
    const search = serialiseFilter(next);
    router.replace(
      search ? `/operator/bookings?${search}` : "/operator/bookings",
      { scroll: false },
    );
  }

  // The API pages by creation time and has no sort option: this orders the
  // fetched page only. Finished trips read newest first, the rest soonest first.
  const rows = sortByDeparture(
    data?.data ?? [],
    (row) => row.legs[0]?.departureAt,
    filter.status === "COMPLETED" || filter.status === "CANCELLED"
      ? "latest"
      : "soonest",
  );
  const filtered = isFiltered(filter);

  return (
    <div className="mt-6 flex flex-col gap-6">
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
          label="Aircraft"
          options={[
            { value: "all", label: "All aircraft" },
            ...(fleet.data?.data ?? []).map((aircraft) => ({
              value: aircraft.id,
              label: `${aircraft.registration}, ${aircraft.manufacturer} ${aircraft.model}`,
            })),
          ]}
          value={filter.aircraftId || "all"}
          onValueChange={(id) =>
            show({ ...filter, aircraftId: id === "all" ? "" : id, page: 1 })
          }
          className="h-10 w-80 max-w-full"
        />
        <Input
          label="Departing from"
          type="date"
          value={filter.from}
          max={filter.to || undefined}
          onChange={(event) =>
            show({ ...filter, from: event.target.value, page: 1 })
          }
          className="h-10 w-44 max-w-full"
        />
        <Input
          label="Departing to"
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
      ) : isPending ? (
        <div aria-busy="true" className="flex flex-col gap-3">
          <p role="status" className="sr-only">
            Loading bookings
          </p>
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-28" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title={filtered ? "No bookings match" : "No upcoming trips"}
          description={
            filtered
              ? "Try another status, aircraft or date."
              : "Confirmed bookings on your aircraft appear here."
          }
          action={
            filtered ? (
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
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <li key={row.reference}>
                <BookingRow row={row} />
              </li>
            ))}
          </ul>
          <Pagination
            page={filter.page}
            pageSize={data.meta.pageSize ?? PAGE_SIZE}
            total={data.meta.total ?? 0}
            onPageChange={(page) => show({ ...filter, page })}
          />
        </>
      )}
    </div>
  );
}

function BookingRow({ row }: { row: Row }) {
  const first = row.legs[0];
  const last = row.legs[row.legs.length - 1];
  return (
    <Card
      variant="interactive"
      className="grid gap-3 p-4 md:grid-cols-[1.6fr_1fr] md:p-5"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/operator/bookings/${encodeURIComponent(row.reference)}`}
            className="font-medium text-accent hover:underline"
          >
            {row.reference}
          </Link>
          <StatusBadge kind="booking" status={row.status} />
          <StatusBadge kind="payment" status={row.paymentStatus} />
        </div>
        <p className="text-body-sm">
          {first.originName} to {last.destinationName}
          {row.legs.length > 1 ? " and back" : ""}
        </p>
        <p className="text-caption text-muted">
          {formatDateTime(first.departureAt)}, {row.passengerCount} passengers
        </p>
        <p className="text-caption text-muted">
          {row.aircraft.registration}, {row.aircraft.manufacturer}{" "}
          {row.aircraft.model}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {row.price ? (
          <PriceLabel
            amountMinor={row.price.amountMinor}
            currency={row.price.currency}
            priceType={row.price.priceType}
            variant="compact"
          />
        ) : (
          <p className="font-medium">Price on request</p>
        )}
      </div>
    </Card>
  );
}
