"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { RecordNotFound } from "@/components/shared/record-not-found";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonClasses } from "@/components/ui/button-classes";
import { apiFetch } from "@/lib/api/client";
import { isNotFoundError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { categoryLabel, formatDuration } from "./format";

type SearchResponse = Schemas["SearchResponseDto"];

/** The aircraft a search found, priced first and cheapest first. */
export function SearchResults({ searchId }: { searchId: string }) {
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

  const { legs, passengerCount, results } = search.data.data;
  const leg = legs[0];
  // Expiry is judged at the time the results were fetched.
  const now = search.dataUpdatedAt;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-h2">
          {leg.originName} to {leg.destinationName}
        </h1>
        <p className="text-body text-muted">
          {formatDateTime(leg.departureAt)} · {passengerCount} passenger
          {passengerCount === 1 ? "" : "s"}
        </p>
        <div>
          <Link
            href="/search"
            className="text-body-sm text-accent hover:underline"
          >
            Change search
          </Link>
        </div>
      </div>

      {results.length === 0 ? (
        <EmptyState
          title="No aircraft available for this trip"
          description="Try another date or time, fewer passengers, or send us an enquiry and our team will look for you."
          action={
            <Link
              href="/contact?topic=PRIVATE_CHARTER#enquiry"
              className={buttonClasses({ variant: "secondary" })}
            >
              Send an enquiry
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-4" aria-label="Aircraft found">
          {results.map((result) => (
            <li key={result.resultId}>
              <Card className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-1">
                  <h2 className="text-title">
                    {result.aircraft.manufacturer} {result.aircraft.model}
                  </h2>
                  <p className="text-body-sm text-muted">
                    {categoryLabel(result.aircraft.category)} · up to{" "}
                    {result.aircraft.passengerCapacity} passengers ·{" "}
                    {result.operatorName}
                  </p>
                  <p className="text-body-sm text-muted">
                    {result.distanceKm} km
                    {result.flightMinutes != null
                      ? ` · about ${formatDuration(result.flightMinutes)}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-3 md:items-end">
                  {result.price ? (
                    <PriceLabel
                      amountMinor={result.price.amountMinor}
                      currency={result.price.currency}
                      priceType={result.price.priceType}
                      validUntil={result.validUntil}
                      expired={new Date(result.validUntil).getTime() < now}
                    />
                  ) : (
                    <p className="text-body font-medium">Price on request</p>
                  )}
                  <Link
                    href={`/search/${searchId}/${result.resultId}`}
                    className={buttonClasses({
                      variant: "secondary",
                      size: "sm",
                    })}
                    aria-label={`Details: ${result.aircraft.manufacturer} ${result.aircraft.model}`}
                  >
                    Details
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
