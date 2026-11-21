"use client";

import { useQuery } from "@tanstack/react-query";
import { LoadError } from "@/components/shared/load-error";
import { StatTile } from "@/components/shared/stat-tile";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Role, Schemas } from "@/lib/api/types";
import { formatDay } from "@/lib/format/date";
import { defaultPeriod } from "./filters";
import { MoneyLines } from "./parts";

/** Headline figures for the last 30 days and the current queues. */
export function AdminDashboard({ role }: { role: Role }) {
  const query = defaultPeriod();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.adminReport("overview", query),
    queryFn: async () =>
      (
        await apiFetch<Schemas["OverviewReportDto"]>("admin/reports/overview", {
          query,
        })
      ).data,
  });

  if (isPending) {
    return (
      <div
        role="status"
        aria-label="Loading the dashboard"
        className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }
  if (isError) {
    return (
      <LoadError
        what="the dashboard"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  const { inPeriod, now, finance, period } = data;
  const ops = role === "OPS" || role === "SUPER_ADMIN";
  const fin = role === "FINANCE_ADMIN" || role === "SUPER_ADMIN";
  const reportHref = (name: string, allowed: boolean) =>
    allowed ? `/admin/reports?report=${name}` : "/admin/reports";

  return (
    <div className="mt-6 flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-title">Right now</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile
            href="/admin/bookings"
            label="Awaiting operator"
            value={now.openBookingRequests}
            caption="Requested, with the operator or awaiting clarification"
          />
          <StatTile
            href="/admin/operators?status=PENDING_REVIEW"
            label="Operators awaiting review"
            value={now.operatorsPendingReview}
          />
          <StatTile
            href={ops ? "/admin/air-ambulance" : "/admin/reports"}
            label="Open air ambulance requests"
            value={now.airAmbulanceOpen}
          />
          {finance ? (
            <StatTile
              href="/admin/refunds"
              label="Refunds due"
              value={finance.refundsDue.count}
              caption={<MoneyLines amounts={finance.refundsDue.amounts} />}
            />
          ) : null}
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-title">
          {formatDay(period.from)} to {formatDay(period.to)}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile
            href={reportHref("search", ops)}
            label="Searches"
            value={inPeriod.searches}
          />
          <StatTile
            href={reportHref("bookings", true)}
            label="Booking requests"
            value={inPeriod.bookingRequests}
          />
          <StatTile
            href={reportHref("air-ambulance", ops)}
            label="Air ambulance requests"
            value={inPeriod.airAmbulanceRequests}
          />
          {finance ? (
            <>
              <StatTile
                href="/admin/payments"
                label="Payments taken"
                value={finance.paymentsTaken.count}
                caption={<MoneyLines amounts={finance.paymentsTaken.amounts} />}
              />
              <StatTile
                href={reportHref("revenue", fin)}
                label="Confirmed booking value"
                value={<MoneyLines amounts={finance.confirmedBookingValue} />}
                caption="Actual, confirmed bookings"
              />
              <StatTile
                href={reportHref("revenue", fin)}
                label="Flyviman revenue"
                value={<MoneyLines amounts={finance.platformRevenue} />}
                caption="Before tax"
              />
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
