"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import {
  emptyTitle,
  operatorListQuery,
  PAGE_SIZE,
  parseOperatorFilter,
  SEARCH_MAX_LENGTH,
  serialiseOperatorFilter,
  STATUS_TABS,
  type OperatorFilter,
  type StatusFilter,
} from "./filters";
import { InlineError } from "./inline-error";
import { serviceLabel } from "./labels";

type OperatorSummary = Schemas["AdminOperatorSummaryDto"];

const COLUMNS = ["Company", "Contact", "Services", "Submitted", "Status"];

export function OperatorsList() {
  const router = useRouter();
  const filter = parseOperatorFilter(useSearchParams());

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.adminOperators(filter),
    queryFn: () =>
      apiFetch<OperatorSummary[]>("admin/operators", {
        query: operatorListQuery(filter),
      }),
  });

  // The view lives in the URL, so it can be shared and returned to.
  function show(next: OperatorFilter) {
    const search = serialiseOperatorFilter(next);
    router.replace(search ? `/admin/operators?${search}` : "/admin/operators", {
      scroll: false,
    });
  }

  const operators = data?.data ?? [];
  const total = data?.meta.total ?? 0;

  return (
    <div className="mt-6 flex flex-col gap-6">
      <SearchForm
        // Starts again from the URL when the view changes elsewhere.
        key={filter.q}
        initial={filter.q}
        onSearch={(q) => show({ ...filter, q, page: 1 })}
      />
      <Tabs
        value={filter.status}
        onValueChange={(status) =>
          show({ ...filter, status: status as StatusFilter, page: 1 })
        }
      >
        <TabsList aria-label="Operator status">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={filter.status} className="flex flex-col gap-4">
          {isError ? (
            <InlineError
              message={messageFor(error)}
              onRetry={() => void refetch()}
            />
          ) : !isPending && operators.length === 0 ? (
            <EmptyState
              title={emptyTitle(filter)}
              description={
                filter.q
                  ? "Check the spelling, or look in another status."
                  : "Operators appear here as their applications reach this status."
              }
              action={
                filter.q ? (
                  <Button
                    variant="secondary"
                    className="h-10"
                    onClick={() => show({ ...filter, q: "", page: 1 })}
                  >
                    Clear search
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div aria-busy={isPending || undefined}>
                {isPending ? (
                  <p role="status" className="sr-only">
                    Loading operators
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
                      ? [0, 1, 2, 3, 4].map((row) => (
                          <TableRow key={row}>
                            {COLUMNS.map((column) => (
                              <TableCell key={column}>
                                <Skeleton className="h-5 w-24" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      : operators.map((operator) => (
                          <OperatorRow key={operator.id} operator={operator} />
                        ))}
                  </TableBody>
                </Table>
              </div>
              {isPending ? null : (
                <Pagination
                  page={filter.page}
                  pageSize={data.meta.pageSize ?? PAGE_SIZE}
                  total={total}
                  onPageChange={(page) => show({ ...filter, page })}
                />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OperatorRow({ operator }: { operator: OperatorSummary }) {
  return (
    <TableRow>
      <TableCell>
        <Link
          href={`/admin/operators/${operator.id}`}
          className="font-medium text-accent hover:underline"
        >
          {operator.legalName}
        </Link>
        {operator.tradingName ? (
          <p className="text-caption text-muted">{operator.tradingName}</p>
        ) : null}
      </TableCell>
      <TableCell>
        <p>{operator.contactName}</p>
        <p className="text-caption text-muted">{operator.contactEmail}</p>
      </TableCell>
      <TableCell>
        {operator.serviceCategories.length > 0 ? (
          operator.serviceCategories.map(serviceLabel).join(", ")
        ) : (
          <span className="text-muted">None chosen</span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {operator.submittedAt ? (
          formatDateTime(operator.submittedAt)
        ) : (
          <span className="text-muted">Not submitted</span>
        )}
      </TableCell>
      <TableCell>
        <StatusBadge kind="operator" status={operator.status} />
      </TableCell>
    </TableRow>
  );
}

function SearchForm({
  initial,
  onSearch,
}: {
  initial: string;
  onSearch: (q: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <form
      role="search"
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value.trim());
      }}
    >
      <div className="min-w-0 flex-1 sm:max-w-sm">
        <Input
          label="Search by company name"
          type="search"
          maxLength={SEARCH_MAX_LENGTH}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-10 w-full"
        />
      </div>
      <Button type="submit" variant="secondary" className="h-10">
        Search
      </Button>
    </form>
  );
}
