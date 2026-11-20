"use client";

import { useQuery } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useNow } from "@/components/booking/use-now";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { RecordNotFound } from "@/components/shared/record-not-found";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/button-classes";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { isNotFoundError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDay } from "@/lib/format/date";
import { utcToLocal } from "@/lib/format/zoned";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format/aircraft";
import {
  applyFilters,
  carriersOf,
  clock,
  dayOffset,
  isExpired,
  placeCode,
  placeName,
  readFilters,
  sortOffers,
  stopsLabel,
  TIMES_OF_DAY,
  totalLabel,
  totalMinutes,
  writeFilters,
  zoneOf,
  type Filters,
  type Sort,
} from "./logic";
import { OfferDetail } from "./offer-detail";
import type { ScheduledOffer, ScheduledSearchResponse } from "./types";

const SORTS: { value: Sort; label: string }[] = [
  { value: "price", label: "Cheapest" },
  { value: "departure", label: "Earliest" },
  { value: "duration", label: "Shortest" },
];
const STOPS = [
  { value: 0, label: "Non-stop" },
  { value: 1, label: "1 stop" },
  { value: 2, label: "2+ stops" },
];
const SEARCH_AGAIN = "/search?service=flights";

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
        "h-11 shrink-0 rounded-pill border px-3 text-body-sm transition-colors duration-150 ease-standard sm:h-9",
        pressed
          ? "border-accent bg-accent/10 text-accent"
          : "border-border text-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((x) => x !== value)
    : [...list, value];
}

function OfferCard({
  offer,
  expired,
  travellers,
  onOpen,
}: {
  travellers: number;
  offer: ScheduledOffer;
  expired: boolean;
  onOpen: () => void;
}) {
  const first = offer.segments[0];
  const last = offer.segments[offer.segments.length - 1];
  const dep = zoneOf(first, "from");
  const arr = zoneOf(last, "to");
  const plus = dayOffset(first.departAt, last.arriveAt, dep, arr);
  const name = `${offer.carrier.name} ${placeCode(first.from)} to ${placeCode(last.to)}`;
  return (
    <li className="flex flex-col gap-4 rounded-lg bg-surface-raised p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-body-sm text-muted">
          {offer.carrier.name} ·{" "}
          {offer.segments.map((s) => s.flightNumber).join(", ")}
        </p>
        <p className="text-title tabular-nums">
          {clock(first.departAt, dep)} {placeCode(first.from)} to{" "}
          {clock(last.arriveAt, arr)}
          {plus > 0 ? (
            <sup className="ml-0.5 text-caption">+{plus}</sup>
          ) : null}{" "}
          {placeCode(last.to)}
        </p>
        <p className="text-body-sm text-muted">
          {formatDuration(totalMinutes(offer))} · {stopsLabel(offer.stops)} ·{" "}
          {offer.fare.fareFamily} · Checked bag {offer.baggage.checkedKg} kg
        </p>
        {offer.refundable ? (
          <Badge tone="success" className="mt-1 self-start">
            Refundable
          </Badge>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
        <PriceLabel
          amountMinor={offer.fare.amountMinor}
          currency={offer.fare.currency}
          priceType="LIVE_FARE"
          variant="compact"
          expired={expired}
        />
        <p className="text-caption text-muted">{totalLabel(travellers)}</p>
        <Button
          variant="secondary"
          disabled={expired}
          onClick={onOpen}
          aria-label={`${expired ? "Fare expired" : "Details"}: ${name}`}
        >
          {expired ? "Fare expired" : "Details"}
        </Button>
      </div>
    </li>
  );
}

/**
 * The scheduled flights a search found: sort, filters, a notice when some
 * airlines did not answer, and an outbound list (plus a return list for a
 * return search). Every fare is a labelled live fare that stops being
 * offered once its validity passes (business rules 1, 3).
 */
export function ScheduledResults({ searchId }: { searchId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const now = useNow();
  const [openId, setOpenId] = useState<string | null>(null);
  const search = useQuery({
    queryKey: queryKeys.scheduledSearch(searchId),
    queryFn: () =>
      apiFetch<ScheduledSearchResponse>(
        `search/scheduled/${encodeURIComponent(searchId)}`,
      ),
  });

  if (search.isPending) return <Skeleton className="h-96" />;
  if (search.isError) {
    return isNotFoundError(search.error) ? (
      <RecordNotFound
        title="This search has expired or cannot be found"
        description="Flight fares only hold for a short while, or the link is not correct. Search again for the current fares."
        backHref={SEARCH_AGAIN}
        backLabel="Search again"
      />
    ) : (
      <LoadError
        what="these flights"
        error={search.error}
        onRetry={() => void search.refetch()}
      />
    );
  }

  const data = search.data.data;
  const { filters, sort } = readFilters(new URLSearchParams(params.toString()));
  const outbound = data.results.filter((o) => o.direction === "OUTBOUND");
  const returning = data.results.filter((o) => o.direction === "RETURN");
  // The API's fare is the party's total; its answer says who is travelling,
  // infants included. An old `?pax=` in the address is ignored.
  const travellers =
    data.passengers.adults + data.passengers.children + data.passengers.infants;
  const update = (next: Filters, nextSort: Sort = sort) =>
    router.replace(`${pathname}${writeFilters(next, nextSort)}`, {
      scroll: false,
    });
  const show = (offers: ScheduledOffer[]) =>
    sortOffers(applyFilters(offers, filters), sort);
  const allExpired =
    data.results.length > 0 && data.results.every((o) => isExpired(o, now));
  const missed = data.providers.filter((p) => p.status !== "OK");
  const open = data.results.find((o) => o.offerId === openId) ?? null;
  const first = outbound[0]?.segments[0];
  const last = outbound[0]?.segments[outbound[0].segments.length - 1];
  const filtered =
    filters.stops.length + filters.carriers.length + filters.times.length > 0;

  function list(title: string, offers: ScheduledOffer[]) {
    const shown = show(offers);
    return (
      <section aria-label={title} className="flex flex-col gap-3">
        <h2 className="text-h3">{title}</h2>
        {shown.length === 0 ? (
          <EmptyState
            title={
              offers.length === 0
                ? "No flights found"
                : "No flights match these filters"
            }
            description={
              offers.length === 0
                ? "Try other dates or airports."
                : "Clear a filter to see more."
            }
            action={
              filtered ? (
                <Button
                  variant="secondary"
                  onClick={() => update({ stops: [], carriers: [], times: [] })}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul aria-label={`${title} found`} className="flex flex-col gap-3">
            {shown.map((offer) => (
              <OfferCard
                key={offer.offerId}
                offer={offer}
                expired={isExpired(offer, now)}
                travellers={travellers}
                onOpen={() => setOpenId(offer.offerId)}
              />
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2">Scheduled flights</h1>
        {first && last ? (
          <p className="text-body text-muted">
            {placeName(first.from)} to {placeName(last.to)} ·{" "}
            {formatDay(utcToLocal(first.departAt, zoneOf(first, "from")).date)}
          </p>
        ) : null}
      </div>

      {allExpired ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-md bg-surface p-4"
        >
          <p className="text-title">These fares have expired</p>
          <p className="text-body-sm text-muted">
            Fares hold for a short while. Search again for the current fares.
          </p>
          <Link href={SEARCH_AGAIN} className={buttonClasses()}>
            Search again
          </Link>
        </div>
      ) : null}

      {data.partial ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-md bg-warning/12 p-4 text-body-sm"
        >
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-warning"
          />
          <p>
            Some airlines did not answer in time
            {missed.length > 0
              ? ` (${missed.map((p) => p.name).join(", ")})`
              : ""}
            , so this list may not show every flight. Search again in a moment
            for a fuller list.
          </p>
        </div>
      ) : null}

      {data.results.length > 0 ? (
        <div
          className="flex flex-col gap-3"
          role="group"
          aria-label="Sort and filter"
        >
          <div
            role="group"
            aria-label="Sort by"
            className="flex flex-wrap gap-1.5"
          >
            {SORTS.map((s) => (
              <Chip
                key={s.value}
                pressed={sort === s.value}
                onClick={() => update(filters, s.value)}
              >
                {s.label}
              </Chip>
            ))}
          </div>
          <div
            role="group"
            aria-label="Stops"
            className="flex flex-wrap gap-1.5"
          >
            {STOPS.map((s) => (
              <Chip
                key={s.value}
                pressed={filters.stops.includes(s.value)}
                onClick={() =>
                  update({ ...filters, stops: toggle(filters.stops, s.value) })
                }
              >
                {s.label}
              </Chip>
            ))}
          </div>
          <div
            role="group"
            aria-label="Airlines"
            className="flex flex-wrap gap-1.5"
          >
            {carriersOf(data.results).map((c) => (
              <Chip
                key={c.code}
                pressed={filters.carriers.includes(c.code)}
                onClick={() =>
                  update({
                    ...filters,
                    carriers: toggle(filters.carriers, c.code),
                  })
                }
              >
                {c.name}
              </Chip>
            ))}
          </div>
          <div
            role="group"
            aria-label="Departure time"
            className="flex flex-wrap gap-1.5"
          >
            {TIMES_OF_DAY.map((t) => (
              <Chip
                key={t.value}
                pressed={filters.times.includes(t.value)}
                onClick={() =>
                  update({ ...filters, times: toggle(filters.times, t.value) })
                }
              >
                {t.label}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      {data.results.length === 0 ? (
        <EmptyState
          title="No flights found"
          description="No airline returned a flight for this search. Try other dates or airports."
          action={
            <Link
              href={SEARCH_AGAIN}
              className={buttonClasses({ variant: "secondary" })}
            >
              Search again
            </Link>
          }
        />
      ) : (
        <>
          {list(
            returning.length > 0 ? "Outbound flights" : "Flights",
            outbound,
          )}
          {returning.length > 0 ? list("Return flights", returning) : null}
        </>
      )}

      {open ? (
        <OfferDetail
          key={open.offerId}
          travellers={travellers}
          searchId={searchId}
          offer={open}
          now={now}
          alternatives={sortOffers(
            data.results.filter(
              (o) =>
                o.direction === open.direction &&
                o.offerId !== open.offerId &&
                !isExpired(o, now),
            ),
            "price",
          ).slice(0, 3)}
          onClose={() => setOpenId(null)}
          onPick={setOpenId}
        />
      ) : null}
    </div>
  );
}
