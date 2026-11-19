"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { LocationField } from "@/components/shared/location-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import {
  NO_FILTER,
  PAGE_SIZE,
  emptyLegQuery,
  isFiltered,
  parseEmptyLegFilter,
  serialiseEmptyLegFilter,
  windowError,
  type EmptyLegFilter,
} from "./filters";
import { OfferCard } from "./offer-card";
import type { EmptyLegOffer } from "./types";

/** The filters live in the address; the form edits a draft and applies it. */
export function EmptyLegsList() {
  const router = useRouter();
  const params = useSearchParams();
  const filter = parseEmptyLegFilter(params);
  const key = serialiseEmptyLegFilter(filter);

  function go(next: EmptyLegFilter) {
    const query = serialiseEmptyLegFilter(next);
    router.replace(query ? `/empty-legs?${query}` : "/empty-legs");
  }

  const offers = useQuery({
    queryKey: queryKeys.emptyLegs(key),
    queryFn: () =>
      apiFetch<EmptyLegOffer[]>("empty-legs", { query: emptyLegQuery(filter) }),
  });

  return (
    <div className="mt-8 flex flex-col gap-8">
      {/* Remounted when the address changes, so the draft follows it. */}
      <FilterForm key={key} filter={filter} onApply={go} />
      {offers.isPending ? (
        <Skeleton className="h-64" />
      ) : offers.isError ? (
        <p role="alert" className="text-danger">
          {messageFor(offers.error)}
        </p>
      ) : offers.data.data.length === 0 ? (
        <EmptyState
          title={
            isFiltered(filter)
              ? "No offers match these filters"
              : "No empty legs right now"
          }
          description={
            isFiltered(filter)
              ? "Try a wider window or fewer filters. Offers are added as operators publish them."
              : "Operators publish a flight that would otherwise fly empty as they plan it. Check back soon."
          }
          action={
            isFiltered(filter) ? (
              <Button variant="secondary" onClick={() => go(NO_FILTER)}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {offers.data.data.map((offer) => (
              <li key={offer.id}>
                <OfferCard offer={offer} />
              </li>
            ))}
          </ul>
          <Pagination
            page={filter.page}
            pageSize={offers.data.meta.pageSize ?? PAGE_SIZE}
            total={offers.data.meta.total ?? offers.data.data.length}
            onPageChange={(page) => go({ ...filter, page })}
          />
        </>
      )}
    </div>
  );
}

function FilterForm({
  filter,
  onApply,
}: {
  filter: EmptyLegFilter;
  onApply: (filter: EmptyLegFilter) => void;
}) {
  const [draft, setDraft] = useState(filter);
  const [passengers, setPassengers] = useState(
    filter.passengers ? String(filter.passengers) : "",
  );
  const error = windowError(draft);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (error) return;
    const count = /^\d+$/.test(passengers) ? Number(passengers) : null;
    onApply({
      ...draft,
      passengers: count && count > 0 ? count : null,
      page: 1,
    });
  }

  return (
    <form
      onSubmit={submit}
      aria-label="Filter empty legs"
      className="grid gap-4 rounded-lg bg-surface p-6 md:grid-cols-2"
    >
      <LocationField
        label="From"
        searchLabel="Find the departure airport"
        value={draft.origin}
        onChange={(origin) => setDraft({ ...draft, origin })}
      />
      <LocationField
        label="To"
        searchLabel="Find the arrival airport"
        value={draft.destination}
        onChange={(destination) => setDraft({ ...draft, destination })}
      />
      <Input
        label="Earliest day"
        type="date"
        value={draft.from}
        onChange={(event) => setDraft({ ...draft, from: event.target.value })}
      />
      <Input
        label="Latest day"
        type="date"
        value={draft.to}
        error={error}
        onChange={(event) => setDraft({ ...draft, to: event.target.value })}
      />
      <Input
        label="Passengers"
        type="number"
        min={1}
        value={passengers}
        onChange={(event) => setPassengers(event.target.value)}
      />
      <Input
        label="Highest price (INR)"
        inputMode="decimal"
        value={draft.maxPrice}
        onChange={(event) =>
          setDraft({ ...draft, maxPrice: event.target.value })
        }
      />
      <div className="flex flex-wrap gap-3 md:col-span-2">
        <Button type="submit">Show offers</Button>
        {isFiltered(filter) ? (
          <Button variant="secondary" onClick={() => onApply(NO_FILTER)}>
            Clear filters
          </Button>
        ) : null}
      </div>
    </form>
  );
}
