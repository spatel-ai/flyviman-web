"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { ExpiryBadge } from "@/components/shared/expiry-badge";
import { LoadError } from "@/components/shared/load-error";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { aircraftDocumentLabel, formatDay } from "@/lib/format/aircraft";
import { operatorDocumentLabel } from "@/lib/format/documents";
import {
  type ExpiringFilter,
  KINDS,
  type KindFilter,
  parseExpiringFilter,
  serialiseExpiringFilter,
  WINDOWS,
} from "./filters";

type Row = Schemas["ExpiringDocumentDto"];

const PAGE_SIZE = 20;
const COLUMNS = ["Document", "Belongs to", "Expiry", "Verification"];

function documentName(row: Row): string {
  return row.kind === "AIRCRAFT"
    ? aircraftDocumentLabel(row.type)
    : operatorDocumentLabel(row.type);
}

export function ExpiringDocuments() {
  const router = useRouter();
  const filter = parseExpiringFilter(useSearchParams());
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.adminExpiringDocuments(filter),
    queryFn: () =>
      apiFetch<Row[]>("admin/documents/expiring", {
        query: {
          withinDays: filter.withinDays,
          kind: filter.kind === "ALL" ? undefined : filter.kind,
          page: filter.page,
          pageSize: PAGE_SIZE,
        },
      }),
  });

  function show(next: ExpiringFilter) {
    const search = serialiseExpiringFilter(next);
    router.replace(search ? `/admin/documents?${search}` : "/admin/documents", {
      scroll: false,
    });
  }

  const rows = data?.data ?? [];

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Tabs
          value={filter.kind}
          onValueChange={(kind) =>
            show({ ...filter, kind: kind as KindFilter, page: 1 })
          }
        >
          <TabsList aria-label="Whose documents">
            {KINDS.map((kind) => (
              <TabsTrigger key={kind.value} value={kind.value}>
                {kind.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Select
          label="Expiring within"
          options={[...WINDOWS]}
          value={String(filter.withinDays)}
          onValueChange={(value) =>
            show({
              ...filter,
              withinDays: Number(value) as ExpiringFilter["withinDays"],
              page: 1,
            })
          }
          className="h-10 w-48 max-w-full"
        />
      </div>

      {isError ? (
        <LoadError
          what="expiring documents"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : !isPending && rows.length === 0 ? (
        <EmptyState
          title="Nothing expiring"
          description="No current document expires in this window, and none has expired."
        />
      ) : (
        <>
          {isPending ? null : (
            <p className="text-body-sm text-muted" role="status">
              {data.meta.total ?? rows.length} document
              {(data.meta.total ?? rows.length) === 1 ? "" : "s"}. Operators are
              reminded 30 days, 7 days and on the day.
            </p>
          )}
          <div aria-busy={isPending || undefined}>
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
                            <Skeleton className="h-5 w-28" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : rows.map((row) => (
                      <TableRow key={`${row.kind}-${row.documentId}`}>
                        <TableCell className="font-medium">
                          {documentName(row)}
                        </TableCell>
                        <TableCell>
                          {row.kind === "AIRCRAFT" && row.aircraftId ? (
                            <>
                              <Link
                                href={`/admin/aircraft/${encodeURIComponent(row.aircraftId)}`}
                                className="text-accent hover:underline"
                              >
                                {row.registration}
                              </Link>
                              <p className="text-caption text-muted">
                                {row.operatorName}
                              </p>
                            </>
                          ) : (
                            <Link
                              href={`/admin/operators/${encodeURIComponent(row.operatorId)}`}
                              className="text-accent hover:underline"
                            >
                              {row.operatorName}
                            </Link>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="whitespace-nowrap">
                              {formatDay(row.expiresAt)}
                            </span>
                            <ExpiryBadge expiresAt={row.expiresAt} />
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <StatusBadge
                            kind="document"
                            status={row.verificationStatus}
                          />
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
