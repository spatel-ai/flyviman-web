"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
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
import { isUuid } from "@/lib/utils";

type Summary = Schemas["PriceCalculationSummaryDto"];

const PAGE_SIZE = 25;
const COLUMNS = [
  "Made",
  "Aircraft",
  "Operator",
  "Total",
  "Valid until",
  "Warnings",
];

export function CalculationsList() {
  const router = useRouter();
  const params = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const searchParam = params.get("searchId");
  const searchId = searchParam && isUuid(searchParam) ? searchParam : undefined;
  // The time the list was opened; validity is compared against it.
  const [openedAt] = useState(() => Date.now());

  const filter = { page, searchId };
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.adminPriceCalculations(filter),
    queryFn: () =>
      apiFetch<Summary[]>("admin/price-calculations", {
        query: { page, pageSize: PAGE_SIZE, ...(searchId ? { searchId } : {}) },
      }),
  });

  function goTo(next: number) {
    const search = new URLSearchParams();
    if (searchId) search.set("searchId", searchId);
    if (next > 1) search.set("page", String(next));
    const query = search.toString();
    router.replace(
      query
        ? `/admin/pricing/calculations?${query}`
        : "/admin/pricing/calculations",
      { scroll: false },
    );
  }

  const rows = data?.data ?? [];

  return (
    <div className="mt-6 flex flex-col gap-6">
      {searchId ? (
        <p className="text-body-sm text-muted">
          Showing one search.{" "}
          <Link
            href="/admin/pricing/calculations"
            className="text-accent hover:underline"
          >
            Show all
          </Link>
        </p>
      ) : null}
      {isError ? (
        <LoadError
          what="the calculations"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : !isPending && rows.length === 0 ? (
        <EmptyState
          title="No calculations yet"
          description="Each estimate a customer is shown is stored here, with the inputs and rules it was made from."
        />
      ) : (
        <>
          <div aria-busy={isPending || undefined}>
            {isPending ? (
              <p role="status" className="sr-only">
                Loading calculations
              </p>
            ) : null}
            <Table>
              <TableHead>
                <TableRow>
                  {COLUMNS.map((column) => (
                    <TableHeaderCell key={column}>{column}</TableHeaderCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {isPending
                  ? Array.from({ length: 6 }, (_, index) => (
                      <TableRow key={index}>
                        {COLUMNS.map((column) => (
                          <TableCell key={column}>
                            <Skeleton className="h-5 w-24" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Link
                            href={`/admin/pricing/calculations/${encodeURIComponent(row.id)}`}
                            className="text-accent hover:underline"
                          >
                            {formatDateTime(row.createdAt)}
                          </Link>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {row.aircraftLabel ?? "Unknown aircraft"}
                        </TableCell>
                        <TableCell>
                          {row.operatorName ?? "Unknown operator"}
                        </TableCell>
                        <TableCell>
                          <PriceLabel
                            amountMinor={row.totalMinor}
                            currency={row.currency}
                            priceType={row.priceType}
                            validUntil={row.validUntil}
                            expired={Date.parse(row.validUntil) < openedAt}
                          />
                        </TableCell>
                        <TableCell>{formatDateTime(row.validUntil)}</TableCell>
                        <TableCell className="tabular-nums">
                          {row.warningCount || "—"}
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
            onPageChange={goTo}
          />
        </>
      )}
    </div>
  );
}
