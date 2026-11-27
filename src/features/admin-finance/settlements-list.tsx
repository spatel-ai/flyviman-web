"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MoneyAmount } from "@/components/shared/money-amount";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { listSettlements, type AdminSettlement } from "@/lib/api/payments";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDateTime } from "@/lib/format/date";
import { words } from "@/lib/format/labels";
import { PAGE_SIZE } from "./filters";
import { Paged } from "./refunds-queue";
import { SETTLEMENT_ACTIONS } from "./settlement-schema";
import { SettlementDialog } from "./settlement-dialog";

/** A settlement's status; an unknown one is shown as sent. */
export const SETTLEMENT_STATUS: Record<string, { label: string; tone: Tone }> =
  {
    NOT_DUE: { label: "Not due", tone: "neutral" },
    DUE: { label: "Due", tone: "warning" },
    ON_HOLD: { label: "On hold", tone: "danger" },
    PAID: { label: "Paid", tone: "success" },
  };

const STATUS_OPTIONS = [
  { value: "ALL", label: "All settlements" },
  { value: "DUE", label: "Due" },
  { value: "NOT_DUE", label: "Not due" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "PAID", label: "Paid" },
];

/**
 * What Flyviman owes operators, one record per completed booking, newest
 * first. Finance holds, releases or records a payout made by bank transfer.
 */
export function SettlementsList() {
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [chosen, setChosen] = useState<AdminSettlement | null>(null);
  const filter = { status: status === "ALL" ? undefined : status, page };
  const query = useQuery({
    queryKey: queryKeys.adminSettlements(filter),
    queryFn: () => listSettlements({ ...filter, pageSize: PAGE_SIZE }),
  });

  return (
    <div className="mt-6 flex flex-col gap-6">
      <Select
        label="Status"
        options={STATUS_OPTIONS}
        value={status}
        onValueChange={(next) => {
          setStatus(next);
          setPage(1);
        }}
        className="h-10 w-56 max-w-full"
      />
      <Paged
        query={query}
        page={page}
        onPageChange={setPage}
        what="the settlements"
        empty={{
          title: "No settlements",
          description:
            "A settlement appears a few minutes after a booking is completed with money kept.",
        }}
        columns={[
          "Booking",
          "Operator",
          "Status",
          "Payable",
          "Kept",
          "Commission",
          "Tax",
          "Created",
          "Payout",
          "",
        ]}
        numeric={["Payable", "Kept", "Commission", "Tax"]}
        stickyFirst
        flexible={["Operator"]}
        secondary={["Created"]}
        rowKey={(row) => row.id}
        cells={(row) => {
          const badge = SETTLEMENT_STATUS[row.status];
          const actions = SETTLEMENT_ACTIONS[row.status] ?? [];
          return [
            <span key="booking" className="flex flex-col items-start gap-1">
              {row.bookingReference}
              <StatusBadge kind="booking" status={row.bookingStatus} />
            </span>,
            row.operatorName,
            <span key="status" className="flex flex-col items-start gap-1">
              <Badge tone={badge?.tone ?? "neutral"}>
                {badge?.label ?? words(row.status)}
              </Badge>
              {row.notDueReason ? (
                <span
                  title={row.notDueReason}
                  className="block max-w-32 truncate text-body-sm text-muted"
                >
                  {row.notDueReason}
                </span>
              ) : null}
            </span>,
            <MoneyAmount
              key="payable"
              amountMinor={row.payableMinor}
              currency={row.currency}
            />,
            <MoneyAmount
              key="kept"
              amountMinor={row.keptMinor}
              currency={row.currency}
            />,
            <MoneyAmount
              key="commission"
              amountMinor={row.commissionMinor}
              currency={row.currency}
            />,
            <MoneyAmount
              key="tax"
              amountMinor={row.taxMinor}
              currency={row.currency}
            />,
            formatDateTime(row.createdAt),
            row.paidAt ? (
              <span key="payout" className="flex max-w-28 flex-col">
                <span
                  title={row.paymentReference ?? undefined}
                  className="truncate"
                >
                  {row.paymentReference}
                </span>
                <span className="text-body-sm text-muted">
                  {formatDateTime(row.paidAt)}
                </span>
              </span>
            ) : (
              "—"
            ),
            actions.length > 0 ? (
              <Button
                key="action"
                size="sm"
                variant="secondary"
                aria-label={`Update the settlement for ${row.bookingReference}`}
                onClick={() => setChosen(row)}
              >
                Update
              </Button>
            ) : null,
          ];
        }}
      />
      <SettlementDialog settlement={chosen} onClose={() => setChosen(null)} />
    </div>
  );
}
