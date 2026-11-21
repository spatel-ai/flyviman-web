import { StatusBadge } from "@/components/shared/status-badge";
import { serviceLabel } from "@/features/admin-operators/labels";
import type { Schemas } from "@/lib/api/types";
import { formatMoney } from "@/lib/format/money";
import { formatMinutes, formatRate, humanise } from "./filters";
import { DataTable, Figure, FigureGrid, MoneyLines, Section } from "./parts";

type S = Schemas;

const num = (value: number | null, digits = 0) =>
  value === null ? "—" : value.toFixed(digits);

export function OverviewBody({ data }: { data: S["OverviewReportDto"] }) {
  const { inPeriod, now, finance } = data;
  return (
    <>
      <Section title="In the period">
        <FigureGrid>
          <Figure label="Searches" value={inPeriod.searches} />
          <Figure label="Booking requests" value={inPeriod.bookingRequests} />
          <Figure
            label="Air ambulance requests"
            value={inPeriod.airAmbulanceRequests}
          />
        </FigureGrid>
        <DataTable
          columns={["Booking status now", "Requests"]}
          rows={inPeriod.bookingsByStatus.map((row) => ({
            key: row.status,
            cells: [
              <StatusBadge key="s" kind="booking" status={row.status} />,
              row.count,
            ],
          }))}
        />
      </Section>
      <Section title="Right now" note="Current state, whatever the period.">
        <FigureGrid>
          <Figure
            label="Awaiting operator"
            value={now.openBookingRequests}
            note="Requested, with the operator or awaiting clarification"
          />
          <Figure
            label="Operators awaiting review"
            value={now.operatorsPendingReview}
          />
          <Figure
            label="Open air ambulance requests"
            value={now.airAmbulanceOpen}
          />
        </FigureGrid>
      </Section>
      {finance ? (
        <Section
          title="Finance"
          note="Actual amounts of payments and confirmed bookings, not prices on offer."
        >
          <FigureGrid>
            <Figure
              label="Payments taken"
              value={finance.paymentsTaken.count}
              note="Amounts below"
            />
            <Figure
              label="Amount taken"
              value={<MoneyLines amounts={finance.paymentsTaken.amounts} />}
            />
            <Figure label="Refunds due now" value={finance.refundsDue.count} />
            <Figure
              label="Refund amount due"
              value={<MoneyLines amounts={finance.refundsDue.amounts} />}
            />
            <Figure
              label="Confirmed booking value"
              value={<MoneyLines amounts={finance.confirmedBookingValue} />}
            />
            <Figure
              label="Flyviman revenue"
              value={<MoneyLines amounts={finance.platformRevenue} />}
              note="Before tax"
            />
          </FigureGrid>
        </Section>
      ) : null}
    </>
  );
}

export function SearchBody({ data }: { data: S["SearchReportDto"] }) {
  const row = (label: string, f: S["SearchFiguresDto"]) => ({
    key: label,
    cells: [
      label,
      f.searches,
      f.withoutResults,
      num(f.averageResults, 1),
      f.averageDurationMs === null ? "—" : `${f.averageDurationMs} ms`,
      f.bookingRequests,
      formatRate(f.conversionRate),
    ],
  });
  return (
    <Section
      title="Search volume and conversion"
      note="Conversion is booking requests made in the period per search. A request is not traced back to its search."
    >
      <DataTable
        columns={[
          "Category",
          "Searches",
          "No results",
          "Avg results",
          "Avg time",
          "Requests",
          "Conversion",
        ]}
        rows={[
          row("All", data.totals),
          ...data.byCategory.map((c) => row(serviceLabel(c.category), c)),
        ]}
      />
    </Section>
  );
}

export function BookingsBody({ data }: { data: S["BookingReportDto"] }) {
  const t = data.totals;
  const row = (label: string, f: S["BookingFiguresDto"]) => ({
    key: label,
    cells: [
      label,
      f.requested,
      f.open,
      f.confirmed,
      f.declined,
      f.expired,
      f.cancelled,
      formatRate(f.confirmationRate),
      ...(t.finance
        ? [
            <MoneyLines key="v" amounts={f.finance?.confirmedValue ?? []} />,
            <MoneyLines key="r" amounts={f.finance?.platformRevenue ?? []} />,
          ]
        : []),
    ],
  });
  return (
    <>
      <FigureGrid>
        <Figure label="Requests made" value={t.requested} />
        <Figure
          label="Open bookings"
          value={t.open}
          note="Still in progress, from request to awaiting payment"
        />
        <Figure
          label="Confirmed"
          value={t.confirmed}
          note={`Confirmation rate ${formatRate(t.confirmationRate)}`}
        />
        {t.finance ? (
          <>
            <Figure
              label="Confirmed value"
              value={<MoneyLines amounts={t.finance.confirmedValue} />}
              note="Open requests are never added"
            />
            <Figure
              label="Flyviman revenue"
              value={<MoneyLines amounts={t.finance.platformRevenue} />}
              note="Before tax"
            />
            {t.finance.withoutCalculation > 0 ? (
              <Figure
                label="Confirmed without a price calculation"
                value={t.finance.withoutCalculation}
                note="In value, not in revenue"
              />
            ) : null}
          </>
        ) : null}
      </FigureGrid>
      <Section
        title="By category"
        note="Requests made in the period, by their current booking status."
      >
        <DataTable
          columns={[
            "Category",
            "Requested",
            "Open",
            "Confirmed",
            "Declined",
            "Expired",
            "Cancelled",
            "Confirmation rate",
            ...(t.finance ? ["Confirmed value", "Revenue"] : []),
          ]}
          rows={data.byCategory.map((c) => row(serviceLabel(c.category), c))}
        />
      </Section>
      <Section title="By booking status">
        <DataTable
          columns={["Status", "Requests"]}
          rows={data.byStatus.map((s) => ({
            key: s.status,
            cells: [
              <StatusBadge key="s" kind="booking" status={s.status} />,
              s.count,
            ],
          }))}
        />
      </Section>
    </>
  );
}

export function RevenueBody({ data }: { data: S["RevenueReportDto"] }) {
  const cells = (f: S["RevenueFiguresDto"]) => [
    f.bookings,
    formatMoney(f.grossValueMinor, f.currency),
    formatMoney(f.taxMinor, f.currency),
    formatMoney(f.operatorPayableMinor, f.currency),
    formatMoney(f.platformRevenueMinor, f.currency),
    f.withoutCalculation,
  ];
  const columns = [
    "Bookings",
    "Gross value",
    "Tax",
    "Operator payable",
    "Flyviman revenue",
    "No calculation",
  ];
  return (
    <>
      <p className="max-w-reading text-body-sm text-muted">
        Bookings confirmed in the period and still confirmed, scheduled or
        completed. Amounts come from each booking&apos;s price calculation, one
        row per currency. {data.cancelledAfterConfirmation} confirmed in the
        period and cancelled since are not counted.
      </p>
      <Section title="Totals">
        <DataTable
          columns={["Currency", ...columns]}
          rows={data.totals.map((f) => ({
            key: f.currency,
            cells: [f.currency, ...cells(f)],
          }))}
        />
      </Section>
      <Section title="By category">
        <DataTable
          columns={["Category", "Currency", ...columns]}
          rows={data.byCategory.map((f) => ({
            key: `${f.category}-${f.currency}`,
            cells: [serviceLabel(f.category), f.currency, ...cells(f)],
          }))}
        />
      </Section>
      <Section title="By operator">
        <DataTable
          columns={["Operator", "Currency", ...columns]}
          rows={data.byOperator.map((f) => ({
            key: `${f.operatorId ?? "scheduled"}-${f.currency}`,
            cells: [
              f.operatorName ?? "Scheduled airlines",
              f.currency,
              ...cells(f),
            ],
          }))}
        />
      </Section>
    </>
  );
}

export function PaymentsBody({ data }: { data: S["PaymentReportDto"] }) {
  const r = data.refunds;
  return (
    <>
      <FigureGrid>
        <Figure label="Payment attempts" value={data.attempts} />
        <Figure label="Succeeded" value={data.succeeded} />
        <Figure label="Failed" value={data.failed} />
        <Figure
          label="Success rate"
          value={formatRate(data.successRate)}
          note="Of finished attempts"
        />
        <Figure
          label="Collected"
          value={<MoneyLines amounts={data.collected} />}
        />
        <Figure label="Refunds started" value={r.count} />
        <Figure label="Refunded" value={<MoneyLines amounts={r.refunded} />} />
        <Figure
          label="Refunds in progress"
          value={<MoneyLines amounts={r.inProgress} />}
        />
        <Figure
          label="Refund rate"
          value={
            r.refundRate.length === 0
              ? "—"
              : r.refundRate.map((c) => (
                  <span key={c.currency} className="block">
                    {formatRate(c.rate)} ({c.currency})
                  </span>
                ))
          }
          note="Completed refunds per amount collected"
        />
      </FigureGrid>
      <Section title="Attempts by status">
        <DataTable
          columns={["Status", "Attempts"]}
          rows={data.byStatus.map((s) => ({
            key: s.status,
            cells: [
              <StatusBadge key="s" kind="payment" status={s.status} />,
              s.count,
            ],
          }))}
        />
      </Section>
      <Section title="By payment method">
        <DataTable
          columns={["Method", "Succeeded", "Failed"]}
          rows={data.byMethod.map((m) => ({
            key: m.method ?? "none",
            cells: [
              m.method ? humanise(m.method) : "Not reported",
              m.succeeded,
              m.failed,
            ],
          }))}
        />
      </Section>
      <Section title="Flagged for review">
        <DataTable
          columns={["Reason", "Attempts"]}
          rows={data.flagged.map((f) => ({
            key: f.reason,
            cells: [humanise(f.reason), f.count],
          }))}
          empty="No attempts flagged."
        />
      </Section>
      <Section title="Refunds by status">
        <DataTable
          columns={["Status", "Refunds"]}
          rows={r.byStatus.map((s) => ({
            key: s.status,
            cells: [humanise(s.status), s.count],
          }))}
          empty="No refunds started."
        />
      </Section>
    </>
  );
}

export function OperatorsBody({ data }: { data: S["OperatorReportDto"] }) {
  return (
    <>
      <Section title="Operators by status now">
        <DataTable
          columns={["Status", "Operators"]}
          rows={data.byStatus.map((s) => ({
            key: s.status,
            cells: [humanise(s.status), s.count],
          }))}
        />
      </Section>
      <Section
        title="Operator performance"
        note="Requests made to each operator in the period. Response time is to the first accept, reject or quote. Declined means the aircraft could not fly although the calendar offered it; lower is better."
      >
        <DataTable
          columns={[
            "Operator",
            "Status",
            "Requests",
            "Responded",
            "Response rate",
            "Avg response",
            "Declined",
            "Decline rate",
            "Expired",
            "Confirmed",
            "Cancelled",
          ]}
          rows={data.operators.map((o) => ({
            key: o.operatorId,
            cells: [
              o.operatorName,
              humanise(o.status),
              o.requests,
              o.responded,
              formatRate(o.responseRate),
              formatMinutes(o.averageResponseMinutes),
              o.declined,
              formatRate(o.declineRate),
              o.expired,
              o.confirmed,
              o.cancelled,
            ],
          }))}
        />
      </Section>
    </>
  );
}

export function EmptyLegsBody({ data }: { data: S["EmptyLegReportDto"] }) {
  return (
    <>
      <FigureGrid>
        <Figure label="Offers created" value={data.created} />
        <Figure label="Ever published" value={data.published} />
        <Figure label="Booked" value={data.booked} />
        <Figure label="Withdrawn" value={data.withdrawn} />
        <Figure label="Expired" value={data.expired} />
        <Figure label="Customers following" value={data.interests} />
        <Figure
          label="Booking rate"
          value={formatRate(data.bookingRate)}
          note="Booked per published offer"
        />
      </FigureGrid>
      <Section title="Offers created in the period, by status now">
        <DataTable
          columns={["Status", "Offers"]}
          rows={data.byStatus.map((s) => ({
            key: s.status,
            cells: [humanise(s.status), s.count],
          }))}
        />
      </Section>
    </>
  );
}

export function AirAmbulanceBody({
  data,
}: {
  data: S["AirAmbulanceReportDto"];
}) {
  return (
    <>
      <p className="max-w-reading text-body-sm text-muted">
        Counts and timings only. No patient, medical or contact data appears in
        reports.
      </p>
      <FigureGrid>
        <Figure label="Requests" value={data.requests} />
        <Figure label="Still open" value={data.open} />
        <Figure label="Quoted" value={data.quoted} />
        <Figure label="Confirmed by operations" value={data.confirmed} />
        <Figure label="Completed" value={data.completed} />
        <Figure label="Declined" value={data.declined} />
        <Figure label="Cancelled" value={data.cancelled} />
        <Figure
          label="Average time to quote"
          value={formatMinutes(data.averageMinutesToQuote)}
        />
        <Figure
          label="Average time to confirm"
          value={formatMinutes(data.averageMinutesToConfirm)}
        />
        <Figure
          label="Fulfilment rate"
          value={formatRate(data.fulfilmentRate)}
          note="Completed per closed request"
        />
      </FigureGrid>
      <Section title="Requests by status now">
        <DataTable
          columns={["Status", "Requests"]}
          rows={data.byStatus.map((s) => ({
            key: s.status,
            cells: [humanise(s.status), s.count],
          }))}
        />
      </Section>
    </>
  );
}
