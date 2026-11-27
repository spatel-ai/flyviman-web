"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { RecordNotFound } from "@/components/shared/record-not-found";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isNotFoundError } from "@/lib/api/errors";
import { getReceipt } from "@/lib/api/payments";
import { queryKeys } from "@/lib/api/query-keys";
import { serviceLabel } from "@/lib/format/labels";
import { formatDateTime } from "@/lib/format/date";

const PURPOSE: Record<string, string> = {
  FULL: "Full payment",
  DEPOSIT: "Deposit",
  BALANCE: "Balance",
};

/**
 * A printable payment receipt (W4-1). It is not a GST tax invoice, and says
 * so in the API's own words.
 */
export function Receipt({
  bookingReference,
  paymentReference,
}: {
  bookingReference: string;
  paymentReference: string;
}) {
  const receipt = useQuery({
    queryKey: queryKeys.paymentReceipt(paymentReference),
    queryFn: () => getReceipt(paymentReference),
  });
  const tripHref = `/account/trips/${encodeURIComponent(bookingReference)}`;

  if (receipt.isPending) {
    return (
      <div role="status" aria-label="Loading">
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (receipt.isError) {
    return isNotFoundError(receipt.error) ? (
      <RecordNotFound
        title="Receipt not found"
        description="This payment has no receipt, or it is not one of yours."
        backHref={tripHref}
        backLabel="Back to your trip"
      />
    ) : (
      <LoadError
        what="this receipt"
        error={receipt.error}
        onRetry={() => void receipt.refetch()}
      />
    );
  }

  const r = receipt.data;
  const rows: [string, string][] = [
    ["Receipt number", r.receiptNumber],
    ["Issued", formatDateTime(r.issuedAt)],
    ["Booking", r.bookingReference],
    ["Service", serviceLabel(r.category)],
    ["Payment", PURPOSE[r.purpose] ?? r.purpose],
    ["Method", r.method.label],
    ["Paid", r.paidAt ? formatDateTime(r.paidAt) : "—"],
  ];

  return (
    <article className="flex max-w-reading flex-col gap-6">
      <Link
        href={tripHref}
        className="text-body-sm text-accent hover:underline print:hidden"
      >
        Back to trip {bookingReference}
      </Link>
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-h3">Payment receipt</h1>
          <Button
            variant="secondary"
            className="print:hidden"
            onClick={() => window.print()}
          >
            Print
          </Button>
        </div>
        <p className="text-body-sm text-muted">{r.issuer.name}</p>
        {r.issuer.address ? (
          <p className="text-body-sm text-muted">{r.issuer.address}</p>
        ) : null}
        {r.issuer.email || r.issuer.phone ? (
          <p className="text-body-sm text-muted">
            {[r.issuer.email, r.issuer.phone].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </header>
      <p role="note" className="text-body-sm font-medium">
        {r.notice}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <section aria-label="Amount paid" className="flex flex-col gap-2">
        <PriceLabel
          amountMinor={r.amount.amountMinor}
          currency={r.amount.currency}
          priceType={r.amount.priceType}
        />
        {r.refundedMinor > 0 ? (
          <>
            <p className="text-body-sm text-muted">Refunded</p>
            <PriceLabel
              amountMinor={r.refundedMinor}
              currency={r.amount.currency}
              priceType="CONFIRMED"
              variant="compact"
            />
            <p className="text-body-sm text-muted">Net paid</p>
            <PriceLabel
              amountMinor={r.netPaidMinor}
              currency={r.amount.currency}
              priceType="CONFIRMED"
              variant="compact"
            />
          </>
        ) : null}
      </section>
    </article>
  );
}
