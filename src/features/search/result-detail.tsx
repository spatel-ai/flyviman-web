"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { RecordNotFound } from "@/components/shared/record-not-found";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { isNotFoundError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { categoryLabel, formatDuration, requestHref } from "./format";

type Detail = Schemas["SearchResultDetailDto"];

/**
 * One aircraft for one trip: the estimate and how it is made up, what it
 * leaves out, and what happens next. Cancellation conditions are stated
 * before anything is committed (business rule 9).
 */
export function ResultDetail({
  searchId,
  resultId,
}: {
  searchId: string;
  resultId: string;
}) {
  const result = useQuery({
    queryKey: queryKeys.searchResult(searchId, resultId),
    queryFn: () =>
      apiFetch<Detail>(
        `search/${encodeURIComponent(searchId)}/results/${encodeURIComponent(resultId)}`,
      ),
  });

  if (result.isPending) return <Skeleton className="h-96" />;
  if (result.isError) {
    return isNotFoundError(result.error) ? (
      <RecordNotFound
        title="Result not found"
        description="This result does not exist, or the link is not correct."
        backHref="/search"
        backLabel="Start a new search"
      />
    ) : (
      <LoadError
        what="this result"
        error={result.error}
        onRetry={() => void result.refetch()}
      />
    );
  }

  const detail = result.data.data;
  const leg = detail.legs[0];
  const expired = new Date(detail.validUntil).getTime() < result.dataUpdatedAt;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link
          href={`/search/${searchId}`}
          className="text-body-sm text-accent hover:underline"
        >
          All results
        </Link>
        <h1 className="text-h2">
          {detail.aircraft.manufacturer} {detail.aircraft.model}
        </h1>
        <p className="text-body text-muted">
          {categoryLabel(detail.aircraft.category)} · up to{" "}
          {detail.aircraft.passengerCapacity} passengers · operated by{" "}
          {detail.operatorName}
        </p>
        <p className="text-body text-muted">
          {leg.originName} to {leg.destinationName} ·{" "}
          {formatDateTime(leg.departureAt)} · {detail.distanceKm} km
          {detail.flightMinutes != null
            ? ` · about ${formatDuration(detail.flightMinutes)}`
            : ""}
        </p>
      </div>

      <Card className="flex flex-col gap-6 p-6">
        {detail.price ? (
          <>
            <PriceLabel
              amountMinor={detail.price.amountMinor}
              currency={detail.price.currency}
              priceType={detail.price.priceType}
              validUntil={detail.validUntil}
              expired={expired}
            />
            <table className="w-full text-body-sm">
              <caption className="sr-only">How the estimate is made up</caption>
              <tbody>
                {detail.breakdown.map((line) => (
                  <tr
                    key={line.code}
                    className="border-b border-border last:border-0"
                  >
                    <th scope="row" className="py-2 text-left font-normal">
                      {line.label}
                      {line.basis ? (
                        <span className="block text-caption text-muted">
                          {line.basis}
                        </span>
                      ) : null}
                    </th>
                    <td className="py-2 text-right tabular-nums">
                      {formatMoney(line.amountMinor, detail.price!.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-h3">Price on request</p>
            {detail.warnings.map((warning) => (
              <p key={warning} className="text-body-sm text-muted">
                {warning}
              </p>
            ))}
          </div>
        )}
      </Card>

      {detail.exclusions.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-title">Not included in this estimate</h2>
          <ul className="list-disc pl-5 text-body-sm text-muted">
            {detail.exclusions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {detail.assumptions.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-title">Assumptions</h2>
          <ul className="list-disc pl-5 text-body-sm text-muted">
            {detail.assumptions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-title">What happens next</h2>
        <ul className="list-disc pl-5 text-body-sm text-muted">
          {detail.confirmationRequirements.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-body-sm text-muted">{detail.cancellationNote}</p>
      </section>

      <div>
        <Link
          href={requestHref(detail)}
          className={buttonClasses({ size: "lg" })}
        >
          Request this aircraft
        </Link>
        <p className="mt-2 text-caption text-muted">
          This sends an enquiry. Nothing is booked or charged.
        </p>
      </div>
    </div>
  );
}
