"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
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
import {
  ACTIVE_TABS,
  emptyTitle,
  locationListQuery,
  PAGE_SIZE,
  parseLocationFilter,
  SEARCH_MAX_LENGTH,
  serialiseLocationFilter,
  TYPE_TABS,
  type ActiveFilter,
  type LocationFilter,
  type TypeFilter,
} from "./filters";
import { InlineError } from "./inline-error";
import { formatMoney } from "@/lib/format/money";
import { TYPE_LABELS } from "./labels";
import { AddLocationDialog, EditLocationDialog } from "./location-dialog";

type Location = Schemas["AdminLocationResponseDto"];

const COLUMNS = ["Name", "Type", "Codes", "City", "Charges", "Status", ""];

export function LocationsList() {
  const router = useRouter();
  const filter = parseLocationFilter(useSearchParams());
  const [editing, setEditing] = useState<Location | null>(null);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.adminLocations(filter),
    queryFn: () =>
      apiFetch<Location[]>("admin/locations", {
        query: locationListQuery(filter),
      }),
  });

  function show(next: LocationFilter) {
    const search = serialiseLocationFilter(next);
    router.replace(search ? `/admin/locations?${search}` : "/admin/locations", {
      scroll: false,
    });
  }

  const locations = data?.data ?? [];
  const total = data?.meta.total ?? 0;

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SearchForm
          key={filter.q}
          initial={filter.q}
          onSearch={(q) => show({ ...filter, q, page: 1 })}
        />
        <AddLocationDialog />
      </div>

      <Tabs
        value={filter.type}
        onValueChange={(type) =>
          show({ ...filter, type: type as TypeFilter, page: 1 })
        }
      >
        <TabsList aria-label="Location type">
          {TYPE_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={filter.type} className="flex flex-col gap-4">
          <Tabs
            value={filter.isActive}
            onValueChange={(isActive) =>
              show({
                ...filter,
                isActive: isActive as ActiveFilter,
                page: 1,
              })
            }
          >
            <TabsList aria-label="Active status">
              {ACTIVE_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {isError ? (
            <InlineError
              message={messageFor(error)}
              onRetry={() => void refetch()}
            />
          ) : !isPending && locations.length === 0 ? (
            <EmptyState
              title={emptyTitle(filter)}
              description={
                filter.q
                  ? "Check the spelling, or look under another type or status."
                  : "Add an airport, heliport or landing site to get started."
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
                    Loading locations
                  </p>
                ) : null}
                <Table>
                  <TableHead>
                    <TableRow>
                      {COLUMNS.map((column) => (
                        <TableHeaderCell key={column || "actions"}>
                          {column}
                        </TableHeaderCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isPending
                      ? Array.from({ length: 5 }, (_, index) => (
                          <TableRow key={index}>
                            {COLUMNS.map((column) => (
                              <TableCell key={column || "actions"}>
                                <Skeleton className="h-5 w-24" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      : locations.map((location) => (
                          <TableRow key={location.id}>
                            <TableCell className="font-medium">
                              {location.name}
                            </TableCell>
                            <TableCell>{TYPE_LABELS[location.type]}</TableCell>
                            <TableCell className="tabular-nums">
                              {[location.iata, location.icao]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </TableCell>
                            <TableCell>
                              {[location.city, location.state]
                                .filter(Boolean)
                                .join(", ") || "—"}
                            </TableCell>
                            <TableCell>
                              {location.charges?.categories[0]
                                ? formatMoney(
                                    location.charges.categories[0].landingMinor,
                                    location.charges.currency,
                                  )
                                : "—"}
                            </TableCell>
                            <TableCell>
                              {location.isActive ? "Active" : "Inactive"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="secondary"
                                className="h-10"
                                onClick={() => setEditing(location)}
                              >
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={filter.page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={(page) => show({ ...filter, page })}
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      <EditLocationDialog
        location={editing}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
    </div>
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
      className="flex min-w-0 flex-1 flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value.trim().slice(0, SEARCH_MAX_LENGTH));
      }}
    >
      <Input
        label="Search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={SEARCH_MAX_LENGTH}
        className="h-10 max-w-sm"
        placeholder="Name, city or code"
      />
      <Button type="submit" variant="secondary" className="h-10">
        Search
      </Button>
    </form>
  );
}
