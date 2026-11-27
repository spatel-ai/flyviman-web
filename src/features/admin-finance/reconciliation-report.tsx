"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { MoneyAmount } from "@/components/shared/money-amount";
import { PriceLabel } from "@/components/shared/price-label";
import { Card } from "@/components/ui/card";
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
import {
  getReconciliation,
  type ReconciliationReport as Report,
} from "@/lib/api/payments";
import { queryKeys } from "@/lib/api/query-keys";
import { indiaToday } from "@/lib/format/expiry";
import { PAGE_SIZE } from "./filters";

/** The API's longest period. */
const MAX_DAYS = 92;
const DAY_MS = 86_400_000;

/** What each mismatch means; an unknown kind is shown as sent. */
const KIND: Record<string, string> = {
  PAYMENT_SUMMARY_MISMATCH: "Payment status out of step",
  PAYMENT_FLAGGED: "Check the gateway",
  EXTRA_MONEY_UNREFUNDED: "Extra money not refunded",
  PAYMENT_STUCK: "Payment without an answer",
  REFUND_STUCK: "Refund without an answer",
  KEPT_EXCEEDS_TOTAL: "Kept more than the price",
  SETTLEMENT_MISSING: "Settlement missing",
  SETTLEMENT_AMOUNT_MISMATCH: "Settlement does not add up",
  SETTLEMENT_BOOKING_NOT_COMPLETED: "Settlement on an open booking",
  SETTLEMENT_REFERENCE_REUSED: "Payout reference used twice",
};

/** A kind's label; one this page does not know is turned into words. */
function kindLabel(kind: string): string {
  if (KIND[kind]) return KIND[kind];
  const words = kind.toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Days are Indian days (IST, UTC+05:30), as the rest of the app shows them. */
const IST_OFFSET = "+05:30";

/** The period for two IST days, the second included; null when not valid. */
function periodOf(
  fromDay: string,
  toDay: string,
): { from: string; to: string } | null {
  const from = Date.parse(`${fromDay}T00:00:00.000${IST_OFFSET}`);
  const to = Date.parse(`${toDay}T00:00:00.000${IST_OFFSET}`) + DAY_MS;
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  if (to <= from || to - from > MAX_DAYS * DAY_MS) return null;
  return { from: new Date(from).toISOString(), to: new Date(to).toISOString() };
}

/**
 * Finance's reconciliation: for a period, gateway payments against refunds,
 * bookings and operator settlements, and what does not agree. Our own
 * record only; the gateway is not asked.
 */
export function ReconciliationReport() {
  const [fromDay, setFromDay] = useState(() => `${indiaToday().slice(0, 8)}01`);
  const [toDay, setToDay] = useState(() => indiaToday());
  const period = periodOf(fromDay, toDay);
  const query = useQuery({
    queryKey: queryKeys.adminReconciliation(period ?? {}),
    queryFn: () => getReconciliation(period!),
    enabled: period !== null,
  });

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-wrap gap-4">
        <Input
          label="From (IST)"
          type="date"
          value={fromDay}
          onChange={(event) => setFromDay(event.target.value)}
          className="h-10"
        />
        <Input
          label="To (IST, included)"
          hint="Whole Indian days, midnight to midnight."
          type="date"
          value={toDay}
          onChange={(event) => setToDay(event.target.value)}
          className="h-10"
          error={
            period
              ? undefined
              : `Choose an end on or after the start, at most ${MAX_DAYS} days in all.`
          }
        />
      </div>
      {period === null ? null : query.isError ? (
        <LoadError
          what="the report"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : query.isPending ? (
        <Skeleton className="h-96" />
      ) : (
        <ReportView key={query.data.generatedAt} report={query.data} />
      )}
    </div>
  );
}

function ReportView({ report }: { report: Report }) {
  const [page, setPage] = useState(1);
  const shown = report.mismatches.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  return (
    <>
      {report.totals.length === 0 ? (
        <EmptyState
          title="Nothing in this period"
          description="No payments, refunds or settlements were recorded between these dates."
        />
      ) : (
        report.totals.map((totals) => (
          <Card key={totals.currency} className="flex flex-col gap-4">
            <h2 className="text-h3">Totals ({totals.currency})</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Figure
                label={`Payments received (${totals.paymentsCount})`}
                amount={totals.paymentsInMinor}
                currency={totals.currency}
              />
              <Figure
                label="Of which owed back (paid after closing or twice)"
                amount={totals.extraMoneyMinor}
                currency={totals.currency}
              />
              <Figure
                label="Refunds completed"
                amount={totals.refundsCompletedMinor}
                currency={totals.currency}
              />
              <Figure
                label="Refunds on their way"
                amount={totals.refundsOpenMinor}
                currency={totals.currency}
              />
              <Figure
                label={`Kept on bookings paid (${totals.bookingsCount})`}
                amount={totals.bookingsKeptMinor}
                currency={totals.currency}
              />
              <Figure
                label={`Settlements created (${totals.settlementsCount}): payable`}
                amount={totals.settlementsPayableMinor}
                currency={totals.currency}
              />
              <Figure
                label="Settlements created: commission"
                amount={totals.settlementsCommissionMinor}
                currency={totals.currency}
              />
              <Figure
                label="Settlements created: tax"
                amount={totals.settlementsTaxMinor}
                currency={totals.currency}
              />
              <Figure
                label="Paid out to operators"
                amount={totals.settlementsPaidMinor}
                currency={totals.currency}
              />
            </dl>
          </Card>
        ))
      )}
      <section className="flex flex-col gap-4">
        <h2 className="text-h3">
          Mismatches ({report.mismatchTotal}
          {report.mismatchTotal > report.mismatches.length
            ? `, first ${report.mismatches.length} shown`
            : ""}
          )
        </h2>
        {report.mismatches.length === 0 ? (
          <EmptyState
            title="Everything agrees"
            description="Payments, refunds, bookings and settlements in this period are consistent."
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>What</TableHeaderCell>
                <TableHeaderCell>Booking</TableHeaderCell>
                <TableHeaderCell>Payment or refund</TableHeaderCell>
                <TableHeaderCell className="text-right">Amount</TableHeaderCell>
                <TableHeaderCell>Detail</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shown.map((row, index) => (
                <TableRow
                  key={`${row.kind}-${row.bookingReference}-${(page - 1) * PAGE_SIZE + index}`}
                >
                  <TableCell className="whitespace-nowrap">
                    {kindLabel(row.kind)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {row.bookingReference ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {row.refundReference ?? row.paymentReference ?? "—"}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {row.amountMinor !== null && row.currency ? (
                      <MoneyAmount
                        amountMinor={row.amountMinor}
                        currency={row.currency}
                      />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="max-w-reading">{row.detail}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {report.mismatches.length > PAGE_SIZE ? (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={report.mismatches.length}
            onPageChange={setPage}
          />
        ) : null}
      </section>
    </>
  );
}

function Figure({
  label,
  amount,
  currency,
}: {
  label: string;
  amount: number;
  currency: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-body-sm text-muted">{label}</dt>
      <dd>
        <PriceLabel
          amountMinor={amount}
          currency={currency}
          priceType="CONFIRMED"
          variant="compact"
        />
      </dd>
    </div>
  );
}
