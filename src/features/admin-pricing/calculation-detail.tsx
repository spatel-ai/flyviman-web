"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { RecordNotFound } from "@/components/shared/record-not-found";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { isNotFoundError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { describeConfig, ruleLabel } from "./rules";

type Detail = Schemas["PriceCalculationDetailDto"];

/** The stored inputs worth reading, in order, with how to show each. */
function inputRows(inputs: Record<string, unknown>): [string, string][] {
  const rows: [string, string][] = [];
  const leg = inputs.leg as { departureAt?: string } | undefined;
  const aircraft = inputs.aircraft as
    { category?: string; cruiseSpeedKmh?: number | null } | undefined;
  const add = (label: string, value: unknown, unit = "") => {
    if (typeof value === "number" || typeof value === "string") {
      rows.push([label, `${value}${unit}`]);
    }
  };
  if (leg?.departureAt)
    rows.push(["Departure", formatDateTime(leg.departureAt)]);
  add("Passengers", inputs.passengerCount);
  add("Distance", inputs.distanceKm, " km");
  add("Flight time", inputs.flightMinutes, " min");
  add("Positioning", inputs.positioningMinutes, " min");
  add("Return to base", inputs.repositioningMinutes, " min");
  add("Cruise speed", aircraft?.cruiseSpeedKmh, " km/h");
  return rows;
}

function List({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-title">{title}</h2>
      {items.length === 0 ? (
        <p className="text-body-sm text-muted">{empty}</p>
      ) : (
        <ul className="list-disc pl-5 text-body-sm">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CalculationDetail({ id }: { id: string }) {
  const [openedAt] = useState(() => Date.now());
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.adminPriceCalculation(id),
    queryFn: () =>
      apiFetch<Detail>(`admin/price-calculations/${encodeURIComponent(id)}`),
  });

  if (isError && isNotFoundError(error)) {
    return (
      <RecordNotFound
        title="Calculation not found"
        description="This calculation does not exist, or the link is not correct."
        backHref="/admin/pricing/calculations"
        backLabel="Back to calculations"
      />
    );
  }
  if (isError) {
    return (
      <>
        <h1 className="text-h2">Calculation</h1>
        <div className="mt-6">
          <LoadError
            what="this calculation"
            error={error}
            onRetry={() => void refetch()}
          />
        </div>
      </>
    );
  }
  if (isPending) {
    return (
      <>
        <h1 className="text-h2">Calculation</h1>
        <p role="status" className="sr-only">
          Loading calculation
        </p>
        <Skeleton className="mt-6 h-96" />
      </>
    );
  }

  const calc = data.data;
  const inputs = inputRows(calc.inputs);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/admin/pricing/calculations"
          className="text-body-sm text-accent hover:underline"
        >
          Calculations
        </Link>
        <h1 className="mt-2 text-h2">
          {calc.aircraftLabel ?? "Unknown aircraft"}
          <span className="text-muted">
            {" "}
            · {calc.operatorName ?? "Unknown operator"}
          </span>
        </h1>
        <p className="mt-2 text-body text-muted">
          Made {formatDateTime(calc.createdAt)}. Availability checked{" "}
          {formatDateTime(calc.availabilityCheckedAt)}.
          {calc.searchId ? (
            <>
              {" "}
              <Link
                href={`/admin/pricing/calculations?searchId=${encodeURIComponent(calc.searchId)}`}
                className="text-accent hover:underline"
              >
                Other results of this search
              </Link>
            </>
          ) : null}
        </p>
      </div>

      <Card className="flex flex-col gap-6 p-6">
        <PriceLabel
          amountMinor={calc.totalMinor}
          currency={calc.currency}
          priceType={calc.priceType}
          validUntil={calc.validUntil}
          expired={Date.parse(calc.validUntil) < openedAt}
        />
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Line</TableHeaderCell>
              <TableHeaderCell>How it was worked out</TableHeaderCell>
              <TableHeaderCell className="text-right">Amount</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {calc.breakdown.map((line, index) => (
              <TableRow key={`${line.code}-${index}`}>
                <TableCell className="font-medium">{line.label}</TableCell>
                <TableCell className="text-muted">
                  {line.basis ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {line.amountMinor === null ? (
                    <span className="text-muted">Finance only</span>
                  ) : (
                    formatMoney(line.amountMinor, calc.currency)
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {calc.finance ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-body-sm text-muted">
                Payable to the operator
              </dt>
              <dd className="text-title tabular-nums">
                {formatMoney(calc.finance.operatorPayableMinor, calc.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-body-sm text-muted">Flyviman revenue</dt>
              <dd className="text-title tabular-nums">
                {formatMoney(calc.finance.platformRevenueMinor, calc.currency)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-body-sm text-muted">
            Line amounts, operator payable, Flyviman revenue and rule settings
            are shown to finance only. The total and tax are what the customer
            was told.
          </p>
        )}
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-title">Rules applied</h2>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Rule</TableHeaderCell>
              <TableHeaderCell>Level</TableHeaderCell>
              <TableHeaderCell>Version</TableHeaderCell>
              <TableHeaderCell>Setting</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {calc.appliedRules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">
                  {ruleLabel(rule.type)}
                </TableCell>
                <TableCell>
                  {rule.scope.charAt(0) + rule.scope.slice(1).toLowerCase()}
                </TableCell>
                <TableCell className="tabular-nums">{rule.version}</TableCell>
                <TableCell className="tabular-nums">
                  {rule.config ? describeConfig(rule.type, rule.config) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      {inputs.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-title">Inputs</h2>
          <dl className="grid gap-4 sm:grid-cols-3">
            {inputs.map(([label, value]) => (
              <div key={label}>
                <dt className="text-body-sm text-muted">{label}</dt>
                <dd className="tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <div className="grid gap-8 md:grid-cols-3">
        <List title="Warnings" items={calc.warnings} empty="None." />
        <List title="Assumptions" items={calc.assumptions} empty="None." />
        <List
          title="Not included"
          items={calc.exclusions}
          empty="None listed."
        />
      </div>
    </div>
  );
}
