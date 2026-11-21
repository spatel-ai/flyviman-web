"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PriceLabel } from "@/components/shared/price-label";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { listSettlements, type AdminSettlement } from "@/lib/api/payments";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDateTime } from "@/lib/format/date";
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

function Money({ amount, currency }: { amount: number; currency: string }) {
  return (
    <PriceLabel
      amountMinor={amount}
      currency={currency}
      priceType="CONFIRMED"
      variant="compact"
    />
  );
}

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
          "Created",
          "Booking",
          "Operator",
          "Payable",
          "Commission",
          "Tax",
          "Status",
          "Payout",
          "",
        ]}
        rowKey={(row) => row.id}
        cells={(row) => {
          const badge = SETTLEMENT_STATUS[row.status];
          const actions = SETTLEMENT_ACTIONS[row.status] ?? [];
          return [
            formatDateTime(row.createdAt),
            <span key="booking" className="flex flex-col gap-1">
              {row.bookingReference}
              <StatusBadge kind="booking" status={row.bookingStatus} />
            </span>,
            row.operatorName,
            <Money
              key="payable"
              amount={row.payableMinor}
              currency={row.currency}
            />,
            <Money
              key="commission"
              amount={row.commissionMinor}
              currency={row.currency}
            />,
            <Money key="tax" amount={row.taxMinor} currency={row.currency} />,
            <Badge key="status" tone={badge?.tone ?? "neutral"}>
              {badge?.label ?? row.status}
            </Badge>,
            row.paidAt ? (
              <span key="payout" className="flex flex-col">
                {row.paymentReference}
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
