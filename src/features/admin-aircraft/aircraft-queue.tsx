"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
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

type Summary = Schemas["AdminAircraftSummaryDto"];

const TABS = [
  { value: "PENDING_REVIEW", label: "Under review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Not approved" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "DRAFT", label: "Draft" },
];

const PAGE_SIZE = 20;

export function AircraftQueue() {
  const router = useRouter();
  const params = useSearchParams();
  const status = params.get("status") ?? "PENDING_REVIEW";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const queue = useQuery({
    queryKey: [...queryKeys.adminAircraft(status), page] as const,
    queryFn: () =>
      apiFetch<Summary[]>("admin/aircraft", {
        query: { listingStatus: status, page, pageSize: PAGE_SIZE },
      }),
  });

  return (
    <Tabs
      value={status}
      onValueChange={(next) => router.replace(`/admin/aircraft?status=${next}`)}
      className="mt-6"
    >
      <TabsList aria-label="Listing status">
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={status}>
        {queue.isPending ? (
          <Skeleton className="h-40" />
        ) : queue.isError ? (
          <p role="alert" className="text-danger">
            {messageFor(queue.error)}
          </p>
        ) : queue.data.data.length === 0 ? (
          <EmptyState
            title="Nothing in this list"
            description="Aircraft appear here when an operator submits them."
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Registration</TableHeaderCell>
                <TableHeaderCell>Operator</TableHeaderCell>
                <TableHeaderCell>Aircraft</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {queue.data.data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      href={`/admin/aircraft/${item.id}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {item.registration}
                    </Link>
                  </TableCell>
                  <TableCell>{item.operatorName}</TableCell>
                  <TableCell>
                    {item.manufacturer} {item.model}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <StatusBadge kind="aircraft" status={item.listingStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {queue.data && queue.data.data.length > 0 ? (
          <Pagination
            className="mt-4"
            page={page}
            pageSize={queue.data.meta.pageSize ?? PAGE_SIZE}
            total={queue.data.meta.total ?? 0}
            onPageChange={(next) =>
              router.replace(`/admin/aircraft?status=${status}&page=${next}`)
            }
          />
        ) : null}
      </TabsContent>
    </Tabs>
  );
}
