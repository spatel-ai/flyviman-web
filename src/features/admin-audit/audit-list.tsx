"use client";

import { roleLabel } from "@/lib/format/labels";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatDateTime } from "@/lib/format/date";
import { AuditDetailSheet, type AuditLog } from "./audit-detail-sheet";
import { entityTypeLabel, shortId } from "./labels";
import {
  auditListQuery,
  EMPTY_FILTER,
  isFiltered,
  PAGE_SIZE,
  parseAuditFilter,
  serialiseAuditFilter,
  type AuditFilter,
} from "./filters";

const COLUMNS = ["When", "Actor", "Action", "Entity", ""];

export function AuditList() {
  const router = useRouter();
  const filter = parseAuditFilter(useSearchParams());
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.adminAuditLogs(filter),
    queryFn: () =>
      apiFetch<AuditLog[]>("admin/audit-logs", {
        query: auditListQuery(filter),
      }),
  });

  // The view lives in the URL, so it can be shared and returned to.
  function show(next: AuditFilter) {
    const search = serialiseAuditFilter(next);
    router.replace(
      search ? `/admin/audit-logs?${search}` : "/admin/audit-logs",
      {
        scroll: false,
      },
    );
  }

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "");
    show(
      parseAuditFilter({
        get: (name) => (name === "page" ? null : value(name)),
      }),
    );
  }

  const rows = data?.data ?? [];
  const open = rows.find((row) => row.id === openId) ?? null;

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Keyed on the view, so the boxes follow the URL (Clear, back, a shared link). */}
      <form
        key={serialiseAuditFilter({ ...filter, page: 1 })}
        onSubmit={apply}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <Input
          label="Action"
          name="action"
          defaultValue={filter.action}
          placeholder="e.g. pricing_rule.change"
          maxLength={100}
        />
        <Input
          label="Entity type"
          name="entityType"
          defaultValue={filter.entityType}
          placeholder="e.g. PricingRule"
          maxLength={100}
        />
        <Input
          label="Entity ID"
          name="entityId"
          defaultValue={filter.entityId}
          placeholder="e.g. a booking or rule ID"
          maxLength={100}
        />
        <Input
          label="Actor ID"
          name="actorId"
          defaultValue={filter.actorId}
          placeholder="e.g. a staff or customer ID"
          maxLength={36}
        />
        <Input
          label="From"
          name="from"
          type="date"
          defaultValue={filter.from}
        />
        <Input label="To" name="to" type="date" defaultValue={filter.to} />
        <div className="flex gap-3 sm:col-span-2 lg:col-span-3">
          <Button type="submit" className="h-10">
            Apply filters
          </Button>
          {isFiltered(filter) ? (
            <Button
              type="button"
              variant="secondary"
              className="h-10"
              onClick={() => show(EMPTY_FILTER)}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      </form>

      {isError ? (
        <LoadError
          what="the audit log"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : !isPending && rows.length === 0 ? (
        <EmptyState
          title={
            isFiltered(filter)
              ? "No records match these filters"
              : "No audit records yet"
          }
          description={
            isFiltered(filter)
              ? "Change or clear the filters to see more."
              : "Material changes are recorded here."
          }
        />
      ) : (
        <>
          <div aria-busy={isPending || undefined}>
            {isPending ? (
              <p role="status" className="sr-only">
                Loading the audit log
              </p>
            ) : null}
            <Table>
              <TableHead>
                <TableRow>
                  {COLUMNS.map((column, index) => (
                    <TableHeaderCell key={index}>
                      {column || <span className="sr-only">Details</span>}
                    </TableHeaderCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {isPending
                  ? [0, 1, 2, 3, 4].map((row) => (
                      <TableRow key={row}>
                        {COLUMNS.map((_, index) => (
                          <TableCell key={index}>
                            <Skeleton className="h-5 w-24" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(row.createdAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {row.actorRole ? (
                            <Badge>{roleLabel(row.actorRole)}</Badge>
                          ) : (
                            <span className="text-muted">System</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.action}
                        </TableCell>
                        <TableCell>
                          {entityTypeLabel(row.entityType)}
                          <span
                            className="block text-caption break-all text-muted"
                            title={row.entityId}
                          >
                            {shortId(row.entityId)}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Button
                            variant="ghost"
                            className="h-10"
                            aria-label={`View ${row.action} record`}
                            onClick={() => setOpenId(row.id)}
                          >
                            View
                          </Button>
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

      <AuditDetailSheet
        log={open}
        onOpenChange={(next) => {
          if (!next) setOpenId(null);
        }}
      />
    </div>
  );
}
