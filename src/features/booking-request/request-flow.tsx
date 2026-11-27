"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNow } from "@/components/booking/use-now";
import { CancellationTerms } from "@/components/shared/cancellation-terms";
import { EmptyState } from "@/components/shared/empty-state";
import { FormAlert } from "@/components/shared/form-alert";
import { AddPassengerButton } from "@/components/shared/passenger-dialog";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel, type PriceType } from "@/components/shared/price-label";
import { RecordNotFound } from "@/components/shared/record-not-found";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { ApiError, isNotFoundError } from "@/lib/api/errors";
import { applyApiError } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { useAttemptKey } from "@/lib/idempotency";
import { fewerNamedWarning } from "@/features/trips/passenger-count";
import {
  requestSchema,
  type RequestOutput,
  type RequestValues,
} from "./schema";

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

interface Attempt {
  values: RequestOutput;
  expectedTotalMinor: number | undefined;
  cancellationTermsVersion: number;
}

interface NewTerms {
  version: number;
  summary: string;
}

/** Flyviman's new cancellation terms a 409 BOOKING_TERMS_CHANGED carries, or null. */
export function newTermsFrom(error: unknown): NewTerms | null {
  if (!(error instanceof ApiError) || error.code !== "BOOKING_TERMS_CHANGED") {
    return null;
  }
  const fields = Object.fromEntries(
    error.details.map((d) => [d.field ?? "", d.issue]),
  );
  const version = Number(fields.cancellationTermsVersion);
  if (!Number.isSafeInteger(version) || !fields.summary) return null;
  return { version, summary: fields.summary };
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
  // Same key and shape as the result page (the whole response), so they share the cache.
  const result = useQuery({
    queryKey: queryKeys.searchResult(searchId, resultId),
    queryFn: () =>
      apiFetch<Detail>(
        `search/${encodeURIComponent(searchId)}/results/${encodeURIComponent(resultId)}`,
      ),
  });
  const passengers = useQuery({
    queryKey: queryKeys.passengers,
    queryFn: async () => (await apiFetch<Passenger[]>("me/passengers")).data,
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

  return (
    <RequestForm
      searchId={searchId}
      resultId={resultId}
      detail={result.data.data}
      people={passengers.data}
    />
  );
}

function RequestForm({
  searchId,
  resultId,
  detail,
  people,
}: {
  searchId: string;
  resultId: string;
  detail: Detail;
  people: Passenger[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const now = useNow();
  const attempt = useAttemptKey();
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState<NewEstimate | null>(null);
  const [newTerms, setNewTerms] = useState<NewTerms | null>(null);
  const [last, setLast] = useState<Attempt | null>(null);
  const limit = detail.passengerCount;
  const {
    register,
    control,
    getValues,
    setValue,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<RequestValues, unknown, RequestOutput>({
    resolver: zodResolver(requestSchema(limit)),
    defaultValues: { passengerIds: [], specialRequests: "" },
  });

  // A passenger added here is chosen straight away, while there is a seat.
  function addPassenger(person: Passenger) {
    const chosen = getValues("passengerIds");
    if (chosen.length < limit) setValue("passengerIds", [...chosen, person.id]);
  }

  const send = useMutation({
    mutationFn: ({
      values,
      expectedTotalMinor,
      cancellationTermsVersion,
    }: Attempt) => {
      const body = {
        searchId,
        resultId,
        cancellationTermsVersion,
        currency: "INR",
        ...(expectedTotalMinor === undefined ? {} : { expectedTotalMinor }),
        passengerIds: values.passengerIds,
        ...(values.specialRequests
          ? { specialRequests: values.specialRequests }
          : {}),
      };
      return apiFetch<Created>("bookings", {
        method: "POST",
        headers: { "Idempotency-Key": attempt.keyFor(body) },
        body,
      });
    },
    onSuccess: async ({ data }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tripsAll });
      router.push(`/account/trips/${data.reference}?sent=1`);
    },
    onError: async (failure, sent) => {
      if (!(failure instanceof ApiError && failure.status === 0)) {
        attempt.rotate();
      }
      setLast(sent);
      setChanged(newEstimateFrom(failure));
      setNewTerms(newTermsFrom(failure));
      setError(
        applyApiError(failure, setFieldError, [
          "passengerIds",
          "specialRequests",
        ]),
      );
      // Availability or price moved on: show the result as it is now.
      if (failure instanceof ApiError && failure.status === 409) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.searchResult(searchId, resultId),
        });
      }
    },
  });

  const leg = detail.legs[0];
  const expired = now > 0 && new Date(detail.validUntil).getTime() < now;
  const price = detail.price;

  // What the customer agreed to: a resend after a price or terms change
  // keeps the other agreement, so neither is sent stale.
  function submit(
    expected: number | undefined,
    version: number = detail.cancellationTerms.version,
  ) {
    return handleSubmit((values) => {
      setError(null);
      setChanged(null);
      setNewTerms(null);
      send.mutate({
        values,
        expectedTotalMinor: expected,
        cancellationTermsVersion: version,
      });
    });
  }

  return (
    <form
      noValidate
      className="mx-auto flex max-w-reading flex-col gap-8"
      onSubmit={(event) => void submit(price?.amountMinor)(event)}
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
            description="Add the people who will fly. They are saved to your account too."
            action={<AddPassengerButton onAdded={addPassenger} />}
          />
        ) : (
          <>
            <p className="text-body-sm text-muted">
              Choose the lead passenger and up to {limit - 1} more. The first
              person you choose is the lead.
            </p>
            <Controller
              control={control}
              name="passengerIds"
              render={({ field }) => (
                <>
                  {people.map((person) => (
                    <div
                      key={person.id}
                      className="flex flex-wrap items-center gap-x-3"
                    >
                      <Checkbox
                        label={`${person.firstName} ${person.lastName}`}
                        checked={field.value.includes(person.id)}
                        onCheckedChange={(value) =>
                          field.onChange(
                            value === true
                              ? [...field.value, person.id]
                              : field.value.filter((id) => id !== person.id),
                          )
                        }
                      />
                      {field.value[0] === person.id ? (
                        <Badge tone="accent">Lead passenger</Badge>
                      ) : null}
                    </div>
                  ))}
                  {fewerNamedWarning(limit, field.value.length) ? (
                    <p role="status" className="text-body-sm">
                      {fewerNamedWarning(limit, field.value.length)}
                    </p>
                  ) : null}
                </>
              )}
            />
            {errors.passengerIds ? (
              <p role="alert" className="text-caption text-danger">
                {errors.passengerIds.message}
              </p>
            ) : null}
            <AddPassengerButton variant="secondary" onAdded={addPassenger} />
          </>
        )}
      </fieldset>

      <Textarea
        label="Special requests (optional)"
        hint="For example luggage or accessibility needs. Do not include medical details."
        rows={3}
        maxLength={1000}
        error={errors.specialRequests?.message}
        {...register("specialRequests")}
      />

      {newTerms ? null : (
        <CancellationTerms
          headingLevel={2}
          summary={detail.cancellationTerms.summary}
          charges={detail.cancellationTerms.tiers}
        />
      )}

      <div className="flex flex-col gap-3">
        <FormAlert message={error} />
        {newTerms ? (
          <Card className="flex flex-col gap-3">
            <CancellationTerms
              summary={newTerms.summary}
              charges={[]}
              headingLevel={2}
            />
            <Button
              type="button"
              loading={send.isPending}
              onClick={(event) =>
                void submit(last?.expectedTotalMinor, newTerms.version)(event)
              }
              className="self-start"
            >
              Agree to the new terms and send request
            </Button>
          </Card>
        ) : changed ? (
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
              onClick={(event) =>
                void submit(
                  changed.totalMinor,
                  last?.cancellationTermsVersion,
                )(event)
              }
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
