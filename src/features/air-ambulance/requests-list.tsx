"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { AirAmbulanceStatusBadge } from "@/components/shared/air-ambulance/status";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { buttonClasses } from "@/components/ui/button-classes";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";

type Summary = Schemas["AirAmbulanceSummaryDto"];

const PAGE_SIZE = 20;

/** The customer's own requests, newest first. No medical data. */
export function RequestsList() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.airAmbulanceRequests(page),
    queryFn: () =>
      apiFetch<Summary[]>("air-ambulance/requests", {
        query: { page, pageSize: PAGE_SIZE },
      }),
  });

  if (isError) {
    return (
      <LoadError
        what="your requests"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }
  if (isPending) {
    return (
      <>
        <p role="status" className="sr-only">
          Loading your requests
        </p>
        <Skeleton className="h-40" />
      </>
    );
  }
  const rows = data.data;
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No air ambulance requests"
        description="Requests you send appear here with their status and quote."
        action={
          <Link href="/air-ambulance" className={buttonClasses({})}>
            Request an air ambulance
          </Link>
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <ul aria-label="Air ambulance requests" className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.reference}>
            <Link
              href={`/account/air-ambulance/${encodeURIComponent(row.reference)}`}
              className="flex flex-col gap-3 rounded-lg bg-surface p-5 transition-colors duration-150 ease-standard hover:bg-border/40 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-body font-medium tabular-nums">
                  {row.reference}
                </span>
                <span className="text-body-sm text-muted">
                  {row.originName ?? "Origin"} to{" "}
                  {row.destinationName ?? "destination"},{" "}
                  {formatDateTime(row.preferredAt)}
                </span>
                <span>
                  <AirAmbulanceStatusBadge status={row.status} />
                </span>
              </div>
              {row.price ? (
                <PriceLabel
                  variant="compact"
                  amountMinor={row.price.amountMinor}
                  currency={row.price.currency}
                  priceType={row.price.priceType}
                />
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      <Pagination
        page={page}
        pageSize={data.meta.pageSize ?? PAGE_SIZE}
        total={data.meta.total ?? 0}
        onPageChange={setPage}
      />
    </div>
  );
}
