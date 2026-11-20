"use client";

import { useQuery } from "@tanstack/react-query";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { listBookingPayments, receiptHref } from "@/lib/api/payments";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDateTime } from "@/lib/format/date";

/** How a payment's purpose reads; an unknown one is shown as sent. */
const PURPOSE: Record<string, string> = {
  FULL: "Full payment",
  DEPOSIT: "Deposit",
  BALANCE: "Balance",
};

/**
 * The trip's payments, newest first, each with its own status and, once
 * settled, its receipt. Shown when W4-1's routes exist
 * (FINANCE_ROUTES_READY).
 */
export function PaymentHistory({ reference }: { reference: string }) {
  const payments = useQuery({
    queryKey: queryKeys.bookingPayments(reference),
    queryFn: () => listBookingPayments(reference),
  });

  return (
    <section aria-labelledby="payments-heading" className="flex flex-col gap-3">
      <h2 id="payments-heading" className="text-title">
        Payments
      </h2>
      {payments.isPending ? (
        <Skeleton className="h-16" />
      ) : payments.isError ? (
        <LoadError
          what="your payments"
          error={payments.error}
          onRetry={() => void payments.refetch()}
        />
      ) : payments.data.length === 0 ? (
        <p className="text-body-sm text-muted">No payments yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {payments.data.map((payment) => (
            <li key={payment.reference} className="flex flex-col gap-1.5">
              <span className="flex flex-wrap items-center gap-2 text-body-sm">
                <span className="font-medium">
                  {PURPOSE[payment.purpose] ?? payment.purpose}
                </span>
                <StatusBadge kind="payment" status={payment.status} />
                <span className="text-caption text-muted">
                  {payment.reference} · {formatDateTime(payment.createdAt)}
                </span>
              </span>
              <PriceLabel
                amountMinor={payment.price.amountMinor}
                currency={payment.price.currency}
                priceType={payment.price.priceType}
                variant="compact"
              />
              {payment.receiptAvailable ? (
                <a
                  href={receiptHref(payment.reference)}
                  target="_blank"
                  rel="noopener"
                  className="text-body-sm text-accent hover:underline"
                >
                  Receipt for {payment.reference}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
