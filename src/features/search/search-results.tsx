"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Clock,
  Pencil,
  Route as RouteIcon,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { shortRupees } from "@/components/booking/format";
import { SearchWidget } from "@/components/booking/search-widget";
import { useToday } from "@/components/booking/use-today";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { RecordNotFound } from "@/components/shared/record-not-found";
import { Button } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/button-classes";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { IMAGES } from "@/content/image-credits";
import { apiFetch } from "@/lib/api/client";
import { isNotFoundError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { localToUtc, utcToLocal } from "@/lib/format/zoned";
import { cn } from "@/lib/utils";
import { DateStrip } from "./date-strip";
import {
  applyFilters,
  facetCounts,
  NO_FILTERS,
  priceBounds,
  readFilters,
  writeFilters,
  type Filters,
  type Sort,
} from "./filters";
import { categoryImage, categoryLabel, formatDuration } from "./format";

type SearchResponse = Schemas["SearchResponseDto"];
type Result = Schemas["SearchResultDto"];

const ZONE = "Asia/Kolkata";
const SORTS: { value: Sort; label: string }[] = [
  { value: "price", label: "Cheapest" },
  { value: "fastest", label: "Fastest" },
  { value: "seats", label: "Most seats" },
];

/**
 * The aircraft a search found: the trip at the top (editable), nearby dates
 * with their lowest estimates, filters and sorting, and a card per aircraft.
 * Every price is a labelled estimate (business rule 1).
 */
export function SearchResults({ searchId }: { searchId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const today = useToday();
  const [editing, setEditing] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const search = useQuery({
    queryKey: queryKeys.search(searchId),
    queryFn: () =>
      apiFetch<SearchResponse>(`search/${encodeURIComponent(searchId)}`),
  });

  if (search.isPending) return <Skeleton className="h-96" />;
  if (search.isError) {
    return isNotFoundError(search.error) ? (
      <RecordNotFound
        title="Search not found"
        description="This search does not exist, or the link is not correct."
        backHref="/search"
        backLabel="Start a new search"
      />
    ) : (
      <LoadError
        what="this search"
        error={search.error}
        onRetry={() => void search.refetch()}
      />
    );
  }

  const data = search.data.data;
  const leg = data.legs[0];
  const local = utcToLocal(leg.departureAt, ZONE);
  const kind = data.category === "HELICOPTER" ? "helicopter" : "charter";
  const { filters, sort } = readFilters(new URLSearchParams(params.toString()));
  const shown = applyFilters(data.results, filters, sort);
  // Expiry is judged at the time the results were fetched.
  const fetchedAt = search.dataUpdatedAt;

  function update(next: Filters, nextSort: Sort = sort) {
    router.replace(`${pathname}${writeFilters(next, nextSort)}`, {
      scroll: false,
    });
  }

  async function rerun(date: string) {
    setRerunning(true);
    try {
      const { data: next } = await apiFetch<SearchResponse>(`search/${kind}`, {
        method: "POST",
        body: {
          originId: leg.originId,
          destinationId: leg.destinationId,
          departureAt: localToUtc(date, local.time, ZONE),
          passengerCount: data.passengerCount,
        },
      });
      queryClient.setQueryData(queryKeys.search(next.searchId), { data: next });
      router.push(`/search/${next.searchId}`);
    } finally {
      setRerunning(false);
    }
  }

  const filterPanel = (
    <FilterPanel
      results={data.results}
      filters={filters}
      onChange={(next) => update(next)}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-16 z-20 -mx-4 bg-background/90 px-4 py-3 backdrop-blur md:mx-0 md:rounded-lg md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-title">
              {leg.originName} to {leg.destinationName}
            </h1>
            <p className="text-body-sm text-muted">
              {formatDateTime(leg.departureAt)} · {data.passengerCount}{" "}
              passenger{data.passengerCount === 1 ? "" : "s"} ·{" "}
              {kind === "helicopter" ? "Helicopter" : "Private jet"}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            aria-expanded={editing}
            onClick={() => setEditing((value) => !value)}
          >
            <Pencil aria-hidden="true" className="size-4" />
            {editing ? "Close" : "Edit search"}
          </Button>
        </div>
      </div>

      {editing ? (
        <SearchWidget
          compact
          initial={{
            service: kind,
            originId: leg.originId,
            destinationId: leg.destinationId,
            date: local.date,
            time: local.time,
            passengerCount: data.passengerCount,
          }}
        />
      ) : null}

      <DateStrip
        date={local.date}
        today={today}
        busy={rerunning}
        route={{
          category:
            data.category === "HELICOPTER" ? "HELICOPTER" : "PRIVATE_CHARTER",
          originId: leg.originId,
          destinationId: leg.destinationId,
          passengerCount: data.passengerCount,
        }}
        onChoose={(date) => void rerun(date)}
      />

      <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
        <aside aria-label="Filters" className="hidden md:block">
          {filterPanel}
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-body-sm text-muted" aria-live="polite">
              {shown.length} of {data.results.length} aircraft
            </p>
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="secondary" size="sm" className="md:hidden">
                    <SlidersHorizontal aria-hidden="true" className="size-4" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent title="Filters">{filterPanel}</SheetContent>
              </Sheet>
              <div
                role="radiogroup"
                aria-label="Sort by"
                className="flex rounded-pill bg-surface p-1"
              >
                {SORTS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={sort === option.value}
                    onClick={() => update(filters, option.value)}
                    className={cn(
                      "h-8 rounded-pill px-3 text-body-sm transition-colors duration-150 ease-standard",
                      sort === option.value
                        ? "bg-surface-raised font-medium text-foreground shadow-sm"
                        : "text-muted hover:text-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {data.results.length === 0 ? (
            <EmptyState
              title="No aircraft available on this day"
              description="Try one of the nearby dates above, fewer passengers, or send us an enquiry and our team will look for you."
              action={
                <Link
                  href="/contact?topic=PRIVATE_CHARTER#enquiry"
                  className={buttonClasses({ variant: "secondary" })}
                >
                  Send an enquiry
                </Link>
              }
            />
          ) : shown.length === 0 ? (
            <EmptyState
              title="No aircraft match these filters"
              action={
                <Button variant="secondary" onClick={() => update(NO_FILTERS)}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col gap-4" aria-label="Aircraft found">
              {shown.map((result) => (
                <li key={result.resultId}>
                  <ResultCard
                    result={result}
                    searchId={searchId}
                    expired={new Date(result.validUntil).getTime() < fetchedAt}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  result,
  searchId,
  expired,
}: {
  result: Result;
  searchId: string;
  expired: boolean;
}) {
  const image = IMAGES[categoryImage(result.aircraft.category)];
  const name = `${result.aircraft.manufacturer} ${result.aircraft.model}`;
  return (
    <article className="flex flex-col overflow-hidden rounded-xl bg-surface md:flex-row">
      <div className="relative aspect-video w-full md:aspect-auto md:w-60 md:shrink-0">
        <Image
          src={image.src}
          alt=""
          fill
          placeholder="blur"
          sizes="(min-width: 768px) 15rem, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-caption font-medium tracking-wide text-muted uppercase">
            {categoryLabel(result.aircraft.category)}
          </span>
          <h2 className="text-title">{name}</h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-muted">
            <li className="flex items-center gap-1.5">
              <Users aria-hidden="true" className="size-4" />
              Up to {result.aircraft.passengerCapacity}
            </li>
            {result.flightMinutes != null ? (
              <li className="flex items-center gap-1.5">
                <Clock aria-hidden="true" className="size-4" />
                About {formatDuration(result.flightMinutes)}
              </li>
            ) : null}
            <li className="flex items-center gap-1.5">
              <RouteIcon aria-hidden="true" className="size-4" />
              {result.distanceKm} km
            </li>
          </ul>
          <p className="flex items-center gap-1.5 text-body-sm">
            <BadgeCheck aria-hidden="true" className="size-4 text-success" />
            {result.operatorName} · approved operator
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          {result.price ? (
            <PriceLabel
              amountMinor={result.price.amountMinor}
              currency={result.price.currency}
              priceType={result.price.priceType}
              expired={expired}
            />
          ) : (
            <p className="text-title">Price on request</p>
          )}
          <Link
            href={`/search/${searchId}/${result.resultId}`}
            className={buttonClasses({ size: "sm" })}
            aria-label={`Details: ${name}`}
          >
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}

const SEAT_OPTIONS = [2, 4, 6, 8];
const TIME_OPTIONS = [60, 120, 180];

function FilterPanel({
  results,
  filters,
  onChange,
}: {
  results: Result[];
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  const classes = facetCounts(results, (r) => r.aircraft.category);
  const operators = facetCounts(results, (r) => r.operatorName);
  const bounds = priceBounds(results);
  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-title">Filters</p>
        <button
          type="button"
          onClick={() => onChange(NO_FILTERS)}
          className="text-body-sm text-accent hover:underline"
        >
          Clear all
        </button>
      </div>

      {classes.length > 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-body-sm font-medium">
            Aircraft class
          </legend>
          {classes.map(({ value, count }) => (
            <Checkbox
              key={value}
              label={`${categoryLabel(value)} (${count})`}
              checked={filters.classes.includes(value)}
              onCheckedChange={() =>
                onChange({
                  ...filters,
                  classes: toggle(filters.classes, value),
                })
              }
            />
          ))}
        </fieldset>
      ) : null}

      {bounds && bounds.max > bounds.min ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-body-sm font-medium">
            Estimate up to
          </legend>
          <input
            type="range"
            aria-label="Highest estimate"
            min={bounds.min}
            max={bounds.max}
            step={Math.max(1, Math.round((bounds.max - bounds.min) / 50))}
            value={filters.maxPriceMinor ?? bounds.max}
            onChange={(event) =>
              onChange({
                ...filters,
                maxPriceMinor:
                  Number(event.target.value) >= bounds.max
                    ? null
                    : Number(event.target.value),
              })
            }
            className="w-full accent-accent"
          />
          <p className="text-body-sm text-muted tabular-nums">
            {shortRupees(filters.maxPriceMinor ?? bounds.max)}
          </p>
        </fieldset>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-body-sm font-medium">Seats</legend>
        <div className="flex flex-wrap gap-1.5">
          {SEAT_OPTIONS.map((seats) => (
            <Chip
              key={seats}
              pressed={filters.minSeats === seats}
              onClick={() =>
                onChange({
                  ...filters,
                  minSeats: filters.minSeats === seats ? null : seats,
                })
              }
            >
              {seats}+
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-body-sm font-medium">Flight time</legend>
        <div className="flex flex-wrap gap-1.5">
          {TIME_OPTIONS.map((minutes) => (
            <Chip
              key={minutes}
              pressed={filters.maxMinutes === minutes}
              onClick={() =>
                onChange({
                  ...filters,
                  maxMinutes: filters.maxMinutes === minutes ? null : minutes,
                })
              }
            >
              Up to {minutes / 60} h
            </Chip>
          ))}
        </div>
      </fieldset>

      {operators.length > 1 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-body-sm font-medium">Operator</legend>
          {operators.map(({ value, count }) => (
            <Checkbox
              key={value}
              label={`${value} (${count})`}
              checked={filters.operators.includes(value)}
              onCheckedChange={() =>
                onChange({
                  ...filters,
                  operators: toggle(filters.operators, value),
                })
              }
            />
          ))}
        </fieldset>
      ) : null}
    </div>
  );
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "h-9 rounded-pill border px-3 text-body-sm transition-colors duration-150 ease-standard",
        pressed
          ? "border-accent bg-accent/10 text-accent"
          : "border-border text-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
