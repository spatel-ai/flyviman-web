"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AirAmbulanceStatusBadge } from "@/components/shared/air-ambulance/status";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { Button } from "@/components/ui/button";
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
  RouteText,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import {
  ASSIGNEE_OPTIONS,
  isFiltered,
  PAGE_SIZE,
  parseQueueFilter,
  queueQuery,
  serialiseQueueFilter,
  STATUS_FILTER_OPTIONS,
  type AssigneeFilter,
  type QueueFilter,
  type StatusFilter,
} from "./filters";

type Row = Schemas["AdminAirAmbulanceSummaryDto"];

const COLUMNS = [
  "Received",
  "Reference",
  "Route",
  "Preferred",
  "Status",
  "Owner",
];

/** The operations queue, newest first. No medical or contact data. */
export function Queue({ viewerId }: { viewerId: string }) {
  const router = useRouter();
  const filter = parseQueueFilter(useSearchParams());
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.adminAirAmbulanceRequests(filter),
    queryFn: () =>
      apiFetch<Row[]>("admin/air-ambulance/requests", {
        query: queueQuery(filter),
      }),
  });

  function show(next: QueueFilter) {
    const search = serialiseQueueFilter(next);
    router.replace(
      search ? `/admin/air-ambulance?${search}` : "/admin/air-ambulance",
      { scroll: false },
    );
  }

  const rows = data?.data ?? [];

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Status"
          options={STATUS_FILTER_OPTIONS}
          value={filter.status}
          onValueChange={(status) =>
            show({ ...filter, status: status as StatusFilter, page: 1 })
          }
          className="h-10 w-64 max-w-full"
        />
        <Select
          label="Owner"
          options={ASSIGNEE_OPTIONS}
          value={filter.assignee}
          onValueChange={(assignee) =>
            show({ ...filter, assignee: assignee as AssigneeFilter, page: 1 })
          }
          className="h-10 w-48 max-w-full"
        />
      </div>

      {isError ? (
        <LoadError
          what="the requests"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : !isPending && rows.length === 0 ? (
        <EmptyState
          title={
            isFiltered(filter)
              ? "No requests match these filters"
              : "No air ambulance requests yet"
          }
          description={
            isFiltered(filter)
              ? "Change the status or owner to see more."
              : "Requests customers send appear here."
          }
          action={
            isFiltered(filter) ? (
              <Button
                variant="secondary"
                className="h-10"
                onClick={() =>
                  show({ status: "ALL", assignee: "ALL", page: 1 })
                }
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
                Loading requests
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
                  ? [0, 1, 2, 3].map((row) => (
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
                          <Link
                            href={`/admin/air-ambulance/${encodeURIComponent(row.reference)}`}
                            className="font-medium text-accent hover:underline"
                          >
                            {row.reference}
                          </Link>
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
                        <TableCell className="whitespace-nowrap">
                          <AirAmbulanceStatusBadge status={row.status} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {row.assignedToId === null
                            ? "Unassigned"
                            : row.assignedToId === viewerId
                              ? "You"
                              : "Someone else"}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
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
