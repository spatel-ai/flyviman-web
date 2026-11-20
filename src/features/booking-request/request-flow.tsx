"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useNow } from "@/components/booking/use-now";
import { CancellationTerms } from "@/components/shared/cancellation-terms";
import { EmptyState } from "@/components/shared/empty-state";
import { FormAlert } from "@/components/shared/form-alert";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel, type PriceType } from "@/components/shared/price-label";
import { RecordNotFound } from "@/components/shared/record-not-found";
import { Button } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { ApiError, isNotFoundError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { useAttemptKey } from "@/lib/idempotency";

type Detail = Schemas["SearchResultDetailDto"];
type Passenger = Schemas["PassengerResponseDto"];
type Created = Schemas["BookingCreatedDto"];

interface NewEstimate {
  totalMinor: number;
  currency: string;
  priceType: PriceType;
  validUntil: string | undefined;
}

/** The new estimate a 409 BOOKING_PRICE_CHANGED carries, or null (the result is now priced on request). */
export function newEstimateFrom(error: unknown): NewEstimate | null {
  if (!(error instanceof ApiError) || error.code !== "BOOKING_PRICE_CHANGED") {
    return null;
  }
  const fields = Object.fromEntries(
    error.details.map((d) => [d.field ?? "", d.issue]),
  );
  const totalMinor = Number(fields.totalMinor);
  if (!Number.isSafeInteger(totalMinor) || !fields.currency) return null;
  return {
    totalMinor,
    currency: fields.currency,
    priceType: (fields.priceType as PriceType) ?? "ESTIMATE",
    validUntil: fields.validUntil,
  };
}

/**
 * Sends a booking request from a search result: who is flying, special
 * requests, the cancellation conditions, and the labelled price, then the
 * trip page. Nothing is booked or charged here (rules 1, 2, 9).
 */
export function RequestFlow({
  searchId,
  resultId,
}: {
  searchId: string;
  resultId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const now = useNow();
  const attempt = useAttemptKey();
  const [selected, setSelected] = useState<string[]>([]);
  const [specialRequests, setSpecialRequests] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState<NewEstimate | null>(null);

  const result = useQuery({
    queryKey: queryKeys.searchResult(searchId, resultId),
    queryFn: async () =>
      (
        await apiFetch<Detail>(
          `search/${encodeURIComponent(searchId)}/results/${encodeURIComponent(resultId)}`,
        )
      ).data,
  });
  const passengers = useQuery({
    queryKey: queryKeys.passengers,
    queryFn: async () => (await apiFetch<Passenger[]>("me/passengers")).data,
  });

  const send = useMutation({
    mutationFn: (expectedTotalMinor: number | undefined) => {
      const body = {
        searchId,
        resultId,
        currency: "INR",
        ...(expectedTotalMinor === undefined ? {} : { expectedTotalMinor }),
        passengerIds: selected,
        ...(specialRequests.trim()
          ? { specialRequests: specialRequests.trim() }
          : {}),
      };
      return apiFetch<Created>("bookings", {
        method: "POST",
        headers: { "Idempotency-Key": attempt.keyFor(body) },
        body,
      });
    },
    onSuccess: async ({ data }) => {
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      router.push(`/account/trips/${data.reference}`);
    },
    onError: async (failure) => {
      if (!(failure instanceof ApiError && failure.status === 0)) {
        attempt.rotate();
      }
      const estimate = newEstimateFrom(failure);
      setChanged(estimate);
      setError(messageFor(failure));
      // Availability or price moved on: show the result as it is now.
      if (failure instanceof ApiError && failure.status === 409) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.searchResult(searchId, resultId),
        });
      }
    },
  });

  if (result.isPending || passengers.isPending) {
    return <Skeleton className="h-96" />;
  }
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
  if (passengers.isError) {
    return (
      <LoadError
        what="your saved passengers"
        error={passengers.error}
        onRetry={() => void passengers.refetch()}
      />
    );
  }

  const detail = result.data;
  const leg = detail.legs[0];
  const expired = now > 0 && new Date(detail.validUntil).getTime() < now;
  const limit = detail.passengerCount;
  const people = passengers.data;
  const price = detail.price;

  function toggle(id: string, checked: boolean) {
    setError(null);
    setSelected((current) =>
      checked ? [...current, id] : current.filter((x) => x !== id),
    );
  }

  function submit(expected: number | undefined) {
    if (selected.length === 0) {
      setError("Choose at least the lead passenger.");
      return;
    }
    if (selected.length > limit) {
      setError(
        `This search is for ${limit} passenger${limit === 1 ? "" : "s"}. Choose no more than that.`,
      );
      return;
    }
    setError(null);
    setChanged(null);
    send.mutate(expected);
  }

  return (
    <form
      noValidate
      className="mx-auto flex max-w-reading flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        submit(price?.amountMinor);
      }}
    >
      <div className="flex flex-col gap-2">
        <Link
          href={`/search/${searchId}/${resultId}`}
          className="text-body-sm text-accent hover:underline"
        >
          Back to the aircraft
        </Link>
        <h1 className="text-h3 md:text-h2">Request this flight</h1>
        <p className="text-body text-muted">
          {detail.aircraft.manufacturer} {detail.aircraft.model} · operated by{" "}
          {detail.operatorName}
          <br />
          {leg.originName} to {leg.destinationName} ·{" "}
          {formatDateTime(leg.departureAt)} · {detail.passengerCount} passenger
          {detail.passengerCount === 1 ? "" : "s"}
        </p>
      </div>

      <Card className="flex flex-col gap-2">
        {price ? (
          <PriceLabel
            amountMinor={price.amountMinor}
            currency={price.currency}
            priceType={price.priceType}
            validUntil={detail.validUntil}
            expired={expired}
          />
        ) : (
          <>
            <p className="text-h3">Price on request</p>
            <p className="text-body-sm text-muted">
              The operator will quote. You decide whether to accept the quote.
            </p>
          </>
        )}
      </Card>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-title">Who is flying</legend>
        {people.length === 0 ? (
          <EmptyState
            title="No saved passengers"
            description="Add the people who will fly to your account, then come back to this request."
            action={
              <Link href="/account/passengers" className={buttonClasses({})}>
                Add a passenger
              </Link>
            }
          />
        ) : (
          <>
            <p className="text-body-sm text-muted">
              Choose the lead passenger and up to {limit - 1} more.
            </p>
            {people.map((person) => (
              <Checkbox
                key={person.id}
                label={`${person.firstName} ${person.lastName}`}
                checked={selected.includes(person.id)}
                onCheckedChange={(value) => toggle(person.id, value === true)}
              />
            ))}
          </>
        )}
      </fieldset>

      <Textarea
        label="Special requests (optional)"
        hint="For example luggage or accessibility needs. Do not include medical details."
        rows={3}
        maxLength={1000}
        value={specialRequests}
        onChange={(event) => setSpecialRequests(event.target.value)}
      />

      <CancellationTerms summary={detail.cancellationNote} charges={[]} />

      <div className="flex flex-col gap-3">
        <FormAlert message={error} />
        {changed ? (
          <Card className="flex flex-col gap-3">
            <PriceLabel
              amountMinor={changed.totalMinor}
              currency={changed.currency}
              priceType={changed.priceType}
              validUntil={changed.validUntil}
            />
            <Button
              type="button"
              loading={send.isPending}
              onClick={() => submit(changed.totalMinor)}
              className="self-start"
            >
              Agree and send request
            </Button>
          </Card>
        ) : (
          <Button
            type="submit"
            size="lg"
            loading={send.isPending}
            disabled={expired}
            className="self-start"
          >
            Send request
          </Button>
        )}
        <p className="text-caption text-muted">
          This sends a request. Nothing is booked or charged. The operator
          confirms the aircraft and the price first.
        </p>
      </div>
    </form>
  );
}
