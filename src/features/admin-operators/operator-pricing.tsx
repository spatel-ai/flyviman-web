"use client";

import { useQuery } from "@tanstack/react-query";
import { LoadError } from "@/components/shared/load-error";
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
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatMoney } from "@/lib/format/money";

type OperatorPricing = Schemas["AdminOperatorPricingDto"];
type Defaults = OperatorPricing["operator"];
type AircraftRate = OperatorPricing["aircraft"][number];

/** "₹1,80,000", or "Not set". */
function money(amountMinor: number | null, currency: string): string {
  return amountMinor == null
    ? "Not set"
    : formatMoney(amountMinor, currency, { dropZeroDecimals: true });
}

/** The operator-wide defaults as label and value pairs, in a fixed order. */
export function describeDefaults(
  defaults: Defaults,
): { label: string; value: string }[] {
  const c = defaults.currency;
  const hours =
    defaults.minBillableHours == null
      ? "Not set"
      : `${defaults.minBillableHours} h ${defaults.minBillableHoursPer === "DAY" ? "per day" : "per flight"}`;
  return [
    { label: "Minimum billable hours", value: hours },
    {
      label: "Positioning",
      value:
        defaults.positioningRateFactor == null
          ? "Not set"
          : `${Math.round(defaults.positioningRateFactor * 100)}% of the hourly rate${defaults.freeWithinKm ? `, free within ${defaults.freeWithinKm} km` : ""}`,
    },
    {
      label: "Landing (fallback)",
      value: money(defaults.landingFallbackMinor, c),
    },
    {
      label: "Handling (fallback)",
      value: money(defaults.handlingFallbackMinor, c),
    },
    {
      label: "Waiting per hour",
      value:
        defaults.waitingHourlyMinor == null
          ? "Not set"
          : `${money(defaults.waitingHourlyMinor, c)}, ${defaults.waitingFreeHours ?? 0} h free`,
    },
    { label: "Overnight", value: money(defaults.overnightMinor, c) },
    { label: "Crew per night", value: money(defaults.crewNightMinor, c) },
    {
      label: "Fuel surcharge per flight",
      value: money(defaults.fuelSurchargePerFlightMinor, c),
    },
    {
      label: "Permits per flight",
      value: money(defaults.permitPerFlightMinor, c),
    },
    {
      label: "Navigation per flight",
      value: money(defaults.navigationPerFlightMinor, c),
    },
    {
      label: defaults.otherChargeLabel ?? "Other charge",
      value: money(defaults.otherChargeMinor, c),
    },
  ];
}

const MODEL_LABELS: Record<string, string> = {
  HOURLY: "Hourly",
  SECTOR: "Per sector",
  FIXED_ROUTE: "Fixed routes",
};

/** The rate the engine uses for the aircraft's pricing model. */
export function describeRate(aircraft: AircraftRate): string {
  const c = aircraft.currency;
  switch (aircraft.pricingModel) {
    case "SECTOR":
      return aircraft.sectorRateMinor == null
        ? "No sector rate: price on request"
        : `${formatMoney(aircraft.sectorRateMinor, c, { dropZeroDecimals: true })} per sector`;
    case "FIXED_ROUTE": {
      const routes = aircraft.fixedRoutes ?? [];
      return routes.length === 0
        ? "No routes: price on request"
        : `${routes.length} route${routes.length === 1 ? "" : "s"}, from ${formatMoney(Math.min(...routes.map((r) => r.amountMinor)), c, { dropZeroDecimals: true })}`;
    }
    case "HOURLY":
      return aircraft.hourlyRateMinor == null
        ? "No hourly rate: price on request"
        : `${formatMoney(aircraft.hourlyRateMinor, c, { dropZeroDecimals: true })} per hour`;
    default:
      return "—";
  }
}

function inclusive(aircraft: AircraftRate): string {
  const parts = [
    aircraft.taxInclusive ? "includes GST" : null,
    aircraft.commissionInclusive ? "includes commission" : null,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "Exclusive";
}

/**
 * An operator's own pricing inputs, read-only (M10): what it charges, as it
 * set them. Flyviman's commission, tax and promotions are not here.
 */
export function OperatorPricingPanel({ operatorId }: { operatorId: string }) {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.adminOperatorPricing(operatorId),
    queryFn: () =>
      apiFetch<OperatorPricing>(
        `admin/operators/${encodeURIComponent(operatorId)}/pricing`,
      ).then((result) => result.data),
  });

  if (isPending) return <Skeleton className="mt-3 h-40" />;
  if (isError) {
    return (
      <div className="mt-3">
        <LoadError
          what="the operator's pricing"
          error={error}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-6">
      <p className="text-body-sm text-muted">
        Set by the operator; read-only here. Amounts exclude tax and Flyviman’s
        charges unless a rate says otherwise.
      </p>
      <dl className="grid gap-x-6 gap-y-3 text-body-sm sm:grid-cols-2">
        {describeDefaults(data.operator).map((item) => (
          <div key={item.label} className="flex flex-col">
            <dt className="text-muted">{item.label}</dt>
            <dd className="tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>
      {data.aircraft.length === 0 ? (
        <p className="text-body-sm text-muted">No aircraft yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <h3 className="text-body font-medium">Aircraft rates</h3>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Aircraft</TableHeaderCell>
                <TableHeaderCell>Priced</TableHeaderCell>
                <TableHeaderCell>Rate</TableHeaderCell>
                <TableHeaderCell>Tax and commission</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.aircraft.map((aircraft) => (
                <TableRow key={aircraft.aircraftId}>
                  <TableCell>
                    <span className="font-medium">{aircraft.registration}</span>
                    <span className="block text-caption text-muted">
                      {aircraft.manufacturer} {aircraft.model}
                    </span>
                  </TableCell>
                  <TableCell>
                    {MODEL_LABELS[aircraft.pricingModel] ??
                      aircraft.pricingModel}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {describeRate(aircraft)}
                  </TableCell>
                  <TableCell>{inclusive(aircraft)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.aircraftTotal > data.aircraft.length ? (
            <p className="text-caption text-muted">
              Showing {data.aircraft.length} of {data.aircraftTotal} aircraft.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
