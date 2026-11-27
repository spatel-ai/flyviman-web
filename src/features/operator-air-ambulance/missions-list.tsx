"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { AirAmbulanceStatusBadge } from "@/components/shared/air-ambulance/status";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  RouteText,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";

type Row = Schemas["OperatorAirAmbulanceSummaryDto"];

const PAGE_SIZE = 20;
const COLUMNS = ["Reference", "Status", "Route", "Preferred", "Patients"];

/** Missions this operator was selected for, from the customer's acceptance. */
export function MissionsList() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.operatorAirAmbulanceRequests(page),
    queryFn: () =>
      apiFetch<Row[]>("operator/air-ambulance/requests", {
        query: { page, pageSize: PAGE_SIZE },
      }),
  });

  if (isError) {
    return (
      <div className="mt-6">
        <LoadError
          what="your missions"
          error={error}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }
  if (isPending) {
    return (
      <>
        <p role="status" className="sr-only">
          Loading missions
        </p>
        <Skeleton className="mt-6 h-64" />
      </>
    );
  }
  if (data.data.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          title="No air ambulance missions"
          description="Missions appear here once Flyviman operations select you and the customer accepts the quote."
        />
      </div>
    );
  }
  return (
    <div className="mt-6 flex flex-col gap-4">
      <Table>
        <TableHead>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHeaderCell
                key={column}
                className={column === "Patients" ? "text-right" : undefined}
              >
                {column}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.data.map((row) => (
            <TableRow key={row.reference}>
              <TableCell className="whitespace-nowrap">
                <Link
                  href={`/operator/air-ambulance/${encodeURIComponent(row.reference)}`}
                  className="font-medium text-accent hover:underline"
                >
                  {row.reference}
                </Link>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <AirAmbulanceStatusBadge status={row.status} />
              </TableCell>
              <TableCell className="w-full max-w-0 min-w-40">
                <RouteText
                  origin={row.originName ?? "Unknown"}
                  destination={row.destinationName ?? "unknown"}
                />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDateTime(row.preferredAt)}
              </TableCell>
              <TableCell className="text-right">{row.patientCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        page={page}
        pageSize={data.meta.pageSize ?? PAGE_SIZE}
        total={data.meta.total ?? 0}
        onPageChange={setPage}
      />
    </div>
  );
}
