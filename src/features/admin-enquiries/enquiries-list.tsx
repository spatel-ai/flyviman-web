"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import {
  enquiryListQuery,
  HANDLED_OPTIONS,
  isFiltered,
  PAGE_SIZE,
  parseEnquiryFilter,
  serialiseEnquiryFilter,
  topicLabel,
  TOPIC_OPTIONS,
  type EnquiryFilter,
  type HandledFilter,
  type TopicFilter,
} from "./filters";

type Enquiry = Schemas["AdminEnquiryResponseDto"];

const COLUMNS = ["Received", "Reference", "From", "Topic", "Status"];

export function EnquiriesList() {
  const router = useRouter();
  const filter = parseEnquiryFilter(useSearchParams());

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.adminEnquiries(filter),
    queryFn: () =>
      apiFetch<Enquiry[]>("admin/enquiries", {
        query: enquiryListQuery(filter),
      }),
  });

  // The view lives in the URL, so it can be shared and returned to.
  function show(next: EnquiryFilter) {
    const search = serialiseEnquiryFilter(next);
    router.replace(search ? `/admin/enquiries?${search}` : "/admin/enquiries", {
      scroll: false,
    });
  }

  const rows = data?.data ?? [];

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Status"
          options={HANDLED_OPTIONS}
          value={filter.handled}
          onValueChange={(handled) =>
            show({ ...filter, handled: handled as HandledFilter, page: 1 })
          }
          className="h-10 w-48 max-w-full"
        />
        <Select
          label="Topic"
          options={TOPIC_OPTIONS}
          value={filter.topic}
          onValueChange={(topic) =>
            show({ ...filter, topic: topic as TopicFilter, page: 1 })
          }
          className="h-10 w-72 max-w-full"
        />
      </div>

      {isError ? (
        <LoadError
          what="the enquiries"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : !isPending && rows.length === 0 ? (
        <EmptyState
          title={
            isFiltered(filter)
              ? "No enquiries match these filters"
              : "No enquiries yet"
          }
          description={
            isFiltered(filter)
              ? "Change the status or topic to see more."
              : "Messages sent from the contact page appear here."
          }
          action={
            isFiltered(filter) ? (
              <Button
                variant="secondary"
                className="h-10"
                onClick={() => show({ handled: "ALL", topic: "ALL", page: 1 })}
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
                Loading enquiries
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
                  : rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(row.createdAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Link
                            href={`/admin/enquiries/${row.id}`}
                            className="font-medium text-accent hover:underline"
                          >
                            {row.reference}
                          </Link>
                        </TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{topicLabel(row.topic)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {row.handledAt ? (
                            <Badge tone="success">Handled</Badge>
                          ) : (
                            <Badge tone="warning">Not handled</Badge>
                          )}
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
