"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { HoldTime } from "./hold-time";
import {
  listQuery,
  PAGE_SIZE,
  parseFilter,
  quoteStatusLabel,
  serialiseFilter,
  TABS,
  type RequestFilter,
} from "./status";

type Row = Schemas["OperatorBookingRequestDto"];
type Summary = Schemas["AircraftSummaryResponseDto"];

export function RequestsList() {
  const router = useRouter();
  const filter = parseFilter(useSearchParams());

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.operatorRequests(filter),
    queryFn: () =>
      apiFetch<Row[]>("operator/booking-requests", {
        query: listQuery(filter),
      }),
  });
  const fleet = useQuery({
    queryKey: queryKeys.operatorAircraftAll,
    queryFn: () =>
      apiFetch<Summary[]>("operator/aircraft", { query: { pageSize: 100 } }),
  });

  function show(next: RequestFilter) {
    const search = serialiseFilter(next);
    router.replace(
      search ? `/operator/requests?${search}` : "/operator/requests",
      { scroll: false },
    );
  }

  const rows = data?.data ?? [];
  const filtered = filter.tab !== "waiting" || filter.aircraftId !== "";

  return (
    <div className="mt-6 flex flex-col gap-6">
      <Tabs
        value={filter.tab}
        onValueChange={(tab) => show({ ...filter, tab, page: 1 })}
      >
        <TabsList aria-label="Request status">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
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

      {isError ? (
        <LoadError
          what="the requests"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : isPending ? (
        <div aria-busy="true" className="flex flex-col gap-3">
          <p role="status" className="sr-only">
            Loading requests
          </p>
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-28" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title={filtered ? "No requests match" : "Nothing waiting for you"}
          description={
            filtered
              ? "Try another status or aircraft."
              : "When a customer asks for one of your aircraft, the request appears here."
          }
          action={
            filtered ? (
              <Button
                variant="secondary"
                className="h-10"
                onClick={() =>
                  show({ tab: "waiting", aircraftId: "", page: 1 })
                }
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
                <RequestRow row={row} />
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

function RequestRow({ row }: { row: Row }) {
  const first = row.legs[0];
  const last = row.legs[row.legs.length - 1];
  const quote = row.quote ? quoteStatusLabel(row.quote.status) : null;
  return (
    <Card
      variant="interactive"
      className="grid gap-3 p-4 md:grid-cols-[1.4fr_1fr_1fr] md:p-5"
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/operator/requests/${encodeURIComponent(row.reference)}`}
            className="font-medium text-accent hover:underline"
          >
            {row.reference}
          </Link>
          <StatusBadge kind="booking" status={row.status} />
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
        {quote ? (
          <Badge tone={quote.tone} className="self-start">
            Quote: {quote.label}
          </Badge>
        ) : null}
      </div>
      <div className="text-body-sm">
        <HoldTime expiresAt={row.holdExpiresAt} />
      </div>
    </Card>
  );
}
