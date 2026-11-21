"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { LoadError } from "@/components/shared/load-error";
import { Button } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/button-classes";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, apiUrl } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Role, Schemas } from "@/lib/api/types";
import { formatDay } from "@/lib/format/date";
import { serviceLabel } from "@/lib/format/labels";
import {
  AirAmbulanceBody,
  BookingsBody,
  EmptyLegsBody,
  OperatorsBody,
  OverviewBody,
  PaymentsBody,
  RevenueBody,
  SearchBody,
} from "./bodies";
import {
  REPORT_NAMES,
  REPORTS,
  parseReportFilter,
  periodError,
  reportQuery,
  serialiseReportFilter,
  type ReportFilter,
} from "./filters";

const CATEGORIES = [
  "SCHEDULED_AIRLINE",
  "PRIVATE_CHARTER",
  "HELICOPTER",
  "EMPTY_LEG",
  "AIR_AMBULANCE",
] as const;

const ALL = "ALL";

type ReportBodies = {
  overview: Schemas["OverviewReportDto"];
  search: Schemas["SearchReportDto"];
  bookings: Schemas["BookingReportDto"];
  revenue: Schemas["RevenueReportDto"];
  payments: Schemas["PaymentReportDto"];
  operators: Schemas["OperatorReportDto"];
  "empty-legs": Schemas["EmptyLegReportDto"];
  "air-ambulance": Schemas["AirAmbulanceReportDto"];
};

type Renderers = {
  [K in keyof ReportBodies]: (data: ReportBodies[K]) => ReactNode;
};

const RENDERERS: Renderers = {
  overview: (data) => <OverviewBody data={data} />,
  search: (data) => <SearchBody data={data} />,
  bookings: (data) => <BookingsBody data={data} />,
  revenue: (data) => <RevenueBody data={data} />,
  payments: (data) => <PaymentsBody data={data} />,
  operators: (data) => <OperatorsBody data={data} />,
  "empty-legs": (data) => <EmptyLegsBody data={data} />,
  "air-ambulance": (data) => <AirAmbulanceBody data={data} />,
};

async function fetchReport<K extends keyof ReportBodies>(
  report: K,
  query: ReturnType<typeof reportQuery>,
): Promise<ReportBodies[K]> {
  return (await apiFetch<ReportBodies[K]>(`admin/reports/${report}`, { query }))
    .data;
}

function render<K extends keyof ReportBodies>(
  report: K,
  data: ReportBodies[K],
): ReactNode {
  return RENDERERS[report](data);
}

/** The reports a role may open, with a period and filters in the URL. */
export function ReportsView({ role }: { role: Role }) {
  const router = useRouter();
  const filter = parseReportFilter(useSearchParams(), role);
  const tabs = REPORT_NAMES.filter((name) =>
    REPORTS[name].roles.includes(role),
  );
  const query = reportQuery(filter);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.adminReport(filter.report, query),
    queryFn: () => fetchReport(filter.report, query),
  });

  function show(next: ReportFilter) {
    router.replace(`/admin/reports?${serialiseReportFilter(next)}`, {
      scroll: false,
    });
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <nav aria-label="Reports" className="flex flex-wrap gap-2">
        {tabs.map((name) => (
          <Link
            key={name}
            href={`/admin/reports?${serialiseReportFilter({ ...filter, report: name })}`}
            aria-current={name === filter.report ? "page" : undefined}
            className={buttonClasses({
              variant: name === filter.report ? "primary" : "secondary",
              size: "sm",
            })}
          >
            {REPORTS[name].label}
          </Link>
        ))}
      </nav>

      <Filters
        key={serialiseReportFilter(filter)}
        filter={filter}
        onApply={show}
      />

      <p className="text-body-sm text-muted">
        {formatDay(filter.from)} to {formatDay(filter.to)}, India time. These
        are totals of confirmed and actual amounts, not prices on offer, so they
        are labelled as confirmed.
      </p>

      {isError ? (
        <LoadError
          what="this report"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : isPending ? (
        <div
          role="status"
          aria-label="Loading the report"
          className="flex flex-col gap-4"
        >
          <Skeleton className="h-28" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="flex flex-col gap-8">{render(filter.report, data)}</div>
      )}

      <div>
        <a
          href={apiUrl(`admin/reports/${filter.report}/export`, query)}
          download
          className={buttonClasses({ variant: "secondary", size: "md" })}
        >
          Download CSV
        </a>
      </div>
    </div>
  );
}

function Filters({
  filter,
  onApply,
}: {
  filter: ReportFilter;
  onApply: (next: ReportFilter) => void;
}) {
  const [draft, setDraft] = useState(filter);
  const takes = REPORTS[filter.report].filters;
  const problem = periodError(draft.from, draft.to);

  // The operator list is searched on the server (`q`), so no operator is out
  // of reach however many there are. The chosen one stays in the options.
  const [operatorSearch, setOperatorSearch] = useState("");
  const [searched, setSearched] = useState("");
  const [chosen, setChosen] = useState<{ id: string; label: string } | null>(
    null,
  );
  useEffect(() => {
    const timer = setTimeout(() => setSearched(operatorSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [operatorSearch]);
  const operators = useQuery({
    queryKey: queryKeys.adminOperators({ for: "report-filter", q: searched }),
    enabled: takes.includes("operatorId"),
    queryFn: async () =>
      (
        await apiFetch<Schemas["AdminOperatorSummaryDto"][]>(
          "admin/operators",
          { query: { pageSize: 100, ...(searched ? { q: searched } : {}) } },
        )
      ).data,
  });
  const operatorOptions = (operators.data ?? []).map((o) => ({
    value: o.id,
    label: o.tradingName ?? o.legalName,
  }));
  const chosenOption = draft.operatorId
    ? (operatorOptions.find((o) => o.value === draft.operatorId) ?? {
        value: draft.operatorId,
        label:
          chosen?.id === draft.operatorId ? chosen.label : "Selected operator",
      })
    : null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!problem) onApply(draft);
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-start gap-4">
      <Input
        label="From"
        type="date"
        value={draft.from}
        onChange={(e) => setDraft({ ...draft, from: e.target.value })}
        error={problem ?? undefined}
        className="h-10"
      />
      <Input
        label="To"
        type="date"
        value={draft.to}
        onChange={(e) => setDraft({ ...draft, to: e.target.value })}
        className="h-10"
      />
      {takes.includes("category") ? (
        <Select
          label="Service"
          options={[
            { value: ALL, label: "All services" },
            ...CATEGORIES.map((value) => ({
              value,
              label: serviceLabel(value),
            })),
          ]}
          value={draft.category || ALL}
          onValueChange={(value) =>
            setDraft({ ...draft, category: value === ALL ? "" : value })
          }
          className="h-10 w-56 max-w-full"
        />
      ) : null}
      {takes.includes("operatorId") ? (
        <>
          <Input
            label="Find an operator"
            type="search"
            value={operatorSearch}
            onChange={(e) => setOperatorSearch(e.target.value)}
            maxLength={100}
            className="h-10 w-56 max-w-full"
          />
          <Select
            label="Operator"
            options={[
              { value: ALL, label: "All operators" },
              ...(chosenOption &&
              !operatorOptions.some((o) => o.value === chosenOption.value)
                ? [chosenOption]
                : []),
              ...operatorOptions,
            ]}
            value={draft.operatorId || ALL}
            onValueChange={(value) => {
              const option = operatorOptions.find((o) => o.value === value);
              setChosen(
                option ? { id: option.value, label: option.label } : null,
              );
              setDraft({ ...draft, operatorId: value === ALL ? "" : value });
            }}
            className="h-10 w-56 max-w-full"
          />
        </>
      ) : null}
      <div className="self-end">
        <Button type="submit" disabled={problem !== null}>
          Apply
        </Button>
      </div>
    </form>
  );
}
