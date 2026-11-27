"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { MoneyAmount } from "@/components/shared/money-amount";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { ApiResult } from "@/lib/api/client";
import {
  listRefunds,
  listRefundsDue,
  type RefundDue,
} from "@/lib/api/payments";
import { queryKeys } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format/date";
import { words } from "@/lib/format/labels";
import { PAGE_SIZE } from "./filters";
import { RefundDialog } from "./refund-dialog";

/** Why money is owed back; an unknown kind is shown as sent. */
const DUE_KIND: Record<string, string> = {
  CANCELLATION: "Cancellation",
  BOOKING_CLOSED: "Paid after closing",
  ALREADY_PAID: "Paid twice",
};

const REFUND_STATUS: Record<string, { label: string; tone: Tone }> = {
  REQUESTED: { label: "Requested", tone: "neutral" },
  PENDING: { label: "Pending", tone: "warning" },
  COMPLETED: { label: "Completed", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
};

/**
 * Finance's refunds: what is owed back ("Due", oldest first) and the refunds
 * already started ("History", newest first).
 */
export function RefundsQueue() {
  return (
    <Tabs defaultValue="due" className="mt-6 flex flex-col gap-6">
      <TabsList aria-label="Which refunds">
        <TabsTrigger value="due">Due</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      <TabsContent value="due">
        <DueTab />
      </TabsContent>
      <TabsContent value="history">
        <HistoryTab />
      </TabsContent>
    </Tabs>
  );
}

function DueTab() {
  const [page, setPage] = useState(1);
  const [chosen, setChosen] = useState<RefundDue | null>(null);
  const query = useQuery({
    queryKey: queryKeys.adminRefundsDue(page),
    queryFn: () => listRefundsDue(page, PAGE_SIZE),
  });
  return (
    <>
      <Paged
        query={query}
        page={page}
        onPageChange={setPage}
        what="the refunds due"
        empty={{
          title: "No refunds due",
          description:
            "Money owed back after a cancellation, or paid when it was not due, appears here.",
        }}
        columns={["Due since", "Why", "Booking", "Payment", "Refund due", ""]}
        numeric={["Refund due"]}
        rowKey={(row) => `${row.paymentReference}-${row.kind}`}
        cells={(row) => [
          formatDateTime(row.since),
          DUE_KIND[row.kind] ?? words(row.kind),
          row.bookingReference,
          row.paymentReference,
          <MoneyAmount
            key="due"
            amountMinor={row.dueMinor}
            currency={row.currency}
          />,
          <Button
            key="action"
            size="sm"
            variant="secondary"
            aria-label={`Refund ${row.bookingReference}`}
            onClick={() => setChosen(row)}
          >
            Refund
          </Button>,
        ]}
      />
      <RefundDialog due={chosen} onClose={() => setChosen(null)} />
    </>
  );
}

/** The gateway's refund id, one click to copy, for tracing it in its dashboard. */
function GatewayReference({ id }: { id: string | null }) {
  if (!id) return <span className="text-muted">Not yet issued</span>;
  return (
    <button
      type="button"
      title="Copy gateway reference"
      aria-label={`Copy gateway reference ${id}`}
      className="block max-w-40 truncate font-mono text-caption hover:underline"
      onClick={() => void navigator.clipboard?.writeText(id)}
    >
      {id}
    </button>
  );
}

function HistoryTab() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: queryKeys.adminRefunds(page),
    queryFn: () => listRefunds(page, PAGE_SIZE),
  });
  return (
    <Paged
      query={query}
      page={page}
      onPageChange={setPage}
      what="the refunds"
      empty={{
        title: "No refunds yet",
        description: "Refunds appear here once finance starts one.",
      }}
      numeric={["Amount"]}
      flexible={["Reason"]}
      columns={[
        "Started",
        "Booking",
        "Payment",
        "Amount",
        "Status",
        "Payment status",
        "Reason",
        "Gateway reference",
      ]}
      rowKey={(row) => row.reference}
      cells={(row) => {
        const status = REFUND_STATUS[row.status];
        return [
          formatDateTime(row.createdAt),
          row.bookingReference,
          row.paymentReference,
          <MoneyAmount
            key="amount"
            amountMinor={row.amountMinor}
            currency={row.currency}
          />,
          <Badge key="status" tone={status?.tone ?? "neutral"}>
            {status?.label ?? words(row.status)}
          </Badge>,
          <StatusBadge
            key="payment"
            kind="payment"
            status={row.paymentStatus}
          />,
          row.reason,
          <GatewayReference key="gateway" id={row.providerRefundId} />,
        ];
      }}
    />
  );
}

/** Alignment and sticky edges of one cell of a paged table. */
function pagedCellClass(
  columns: string[],
  index: number,
  numeric: string[],
  stickyFirst: boolean,
  header: boolean,
  flexible: string[],
  secondary: string[],
) {
  const column = columns[index];
  return cn(
    !header && "whitespace-nowrap",
    // Long text: takes the width that is left, one line, cut with an ellipsis.
    !header && flexible.includes(column) && "w-full max-w-0 min-w-20 truncate",
    // Shown only where there is room: from 1,536 px.
    secondary.includes(column) && "hidden 2xl:table-cell",
    numeric.includes(column) && "px-2 text-right",
    !column && "px-2",
    // The row action stays in view; the first column too when asked.
    (!column || (stickyFirst && index === 0)) &&
      cn(
        "sticky",
        header ? "z-30 bg-surface-raised" : "z-[5] bg-background",
        column ? "left-0" : "right-0",
      ),
  );
}

/** A paged table with its loading, empty and error states. */
export function Paged<T>({
  query,
  page,
  onPageChange,
  what,
  empty,
  columns,
  numeric = [],
  stickyFirst = false,
  flexible = [],
  secondary = [],
  rowKey,
  cells,
}: {
  query: {
    data: ApiResult<T[]> | undefined;
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  page: number;
  onPageChange: (page: number) => void;
  what: string;
  empty: { title: string; description: string };
  columns: string[];
  /** Column headings holding amounts: right-aligned. */
  numeric?: string[];
  /** Keep the first column in view while the rest scrolls sideways. */
  stickyFirst?: boolean;
  /** Headings of long-text columns: one line, an ellipsis, the text in `title`. */
  flexible?: string[];
  /** Headings of columns that give way first: hidden below 1,536 px. */
  secondary?: string[];
  rowKey: (row: T) => string;
  cells: (row: T) => ReactNode[];
}) {
  const { data, isPending, isError, error, refetch } = query;
  const rows = data?.data ?? [];
  if (isError) {
    return (
      <LoadError what={what} error={error} onRetry={() => void refetch()} />
    );
  }
  if (!isPending && rows.length === 0) return <EmptyState {...empty} />;
  return (
    <div className="flex flex-col gap-6">
      <Table aria-busy={isPending || undefined}>
        <TableHead>
          <TableRow>
            {columns.map((column, index) => (
              <TableHeaderCell
                key={column || "action"}
                className={pagedCellClass(
                  columns,
                  index,
                  numeric,
                  stickyFirst,
                  true,
                  flexible,
                  secondary,
                )}
              >
                {column ? column : <span className="sr-only">Action</span>}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {isPending
            ? [0, 1, 2].map((row) => (
                <TableRow key={row}>
                  {columns.map((column) => (
                    <TableCell key={column || "action"}>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : rows.map((row) => (
                <TableRow key={rowKey(row)}>
                  {cells(row).map((cell, index) => (
                    <TableCell
                      key={columns[index] || "action"}
                      className={pagedCellClass(
                        columns,
                        index,
                        numeric,
                        stickyFirst,
                        false,
                        flexible,
                        secondary,
                      )}
                      title={
                        flexible.includes(columns[index]) &&
                        typeof cell === "string"
                          ? cell
                          : undefined
                      }
                    >
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
        </TableBody>
      </Table>
      {isPending || !data ? null : (
        <Pagination
          page={page}
          pageSize={data.meta.pageSize ?? PAGE_SIZE}
          total={data.meta.total ?? 0}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
