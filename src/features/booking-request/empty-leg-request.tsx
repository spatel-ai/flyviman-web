"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useNow } from "@/components/booking/use-now";
import { CancellationTerms } from "@/components/shared/cancellation-terms";
import { EmptyState } from "@/components/shared/empty-state";
import { FormAlert } from "@/components/shared/form-alert";
import { AddPassengerButton } from "@/components/shared/passenger-dialog";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { RecordNotFound } from "@/components/shared/record-not-found";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { ApiError, isNotFoundError } from "@/lib/api/errors";
import { applyApiError } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import {
  aircraftLabel,
  isLapsed,
  routeLabel,
  windowLabel,
} from "@/lib/empty-legs/format";
import type { EmptyLegDetail } from "@/lib/empty-legs/types";
import { useAttemptKey } from "@/lib/idempotency";
import { newEstimateFrom, newTermsFrom } from "./request-flow";
import {
  emptyLegRequestSchema,
  type EmptyLegRequestOutput,
  type EmptyLegRequestValues,
} from "./schema";

type Passenger = Schemas["PassengerResponseDto"];
type Created = Schemas["BookingCreatedDto"];
type Body = Schemas["CreateEmptyLegBookingDto"];

interface Attempt {
  values: EmptyLegRequestOutput;
  expectedTotalMinor: number;
  cancellationTermsVersion: number;
  offerUpdatedAt: string;
}

/**
 * Requests a listed empty-leg offer: how many are flying and who, special
 * requests, the offer's conditions and Flyviman's cancellation terms, and
 * the labelled price, then the trip page. Nothing is booked or charged here:
 * the operator confirms first (rules 1, 2, 9).
 */
export function EmptyLegRequest({ id }: { id: string }) {
  // Same key and shape as the offer page, so they share the cache.
  const offer = useQuery({
    queryKey: queryKeys.emptyLeg(id),
    queryFn: () =>
      apiFetch<EmptyLegDetail>(`empty-legs/${encodeURIComponent(id)}`),
  });
  const passengers = useQuery({
    queryKey: queryKeys.passengers,
    queryFn: async () => (await apiFetch<Passenger[]>("me/passengers")).data,
  });

  if (offer.isPending || passengers.isPending) {
    return <Skeleton className="h-96" />;
  }
  if (offer.isError) {
    const ended =
      offer.error instanceof ApiError &&
      (offer.error.code === "EMPTY_LEG_EXPIRED" ||
        offer.error.code === "EMPTY_LEG_WITHDRAWN");
    return ended || isNotFoundError(offer.error) ? (
      <RecordNotFound
        title="Offer not found"
        description="It has ended, been withdrawn or been requested by someone else. Other empty legs may suit you."
        backHref="/empty-legs"
        backLabel="See all empty legs"
      />
    ) : (
      <LoadError
        what="this offer"
        error={offer.error}
        onRetry={() => void offer.refetch()}
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
  return <RequestForm offer={offer.data.data} people={passengers.data} />;
}

function RequestForm({
  offer,
  people,
}: {
  offer: EmptyLegDetail;
  people: Passenger[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const now = useNow();
  const attempt = useAttemptKey();
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState<ReturnType<
    typeof newEstimateFrom
  > | null>(null);
  const [newTerms, setNewTerms] = useState<ReturnType<
    typeof newTermsFrom
  > | null>(null);
  const [last, setLast] = useState<Attempt | null>(null);
  const seats = offer.seatsAvailable;
  const {
    register,
    control,
    getValues,
    setValue,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<EmptyLegRequestValues, unknown, EmptyLegRequestOutput>({
    resolver: zodResolver(emptyLegRequestSchema(seats)),
    defaultValues: {
      passengerCount: "1",
      passengerIds: [],
      specialRequests: "",
    },
  });
  const count = Number(useWatch({ control, name: "passengerCount" }));

  // A passenger added here is chosen straight away, while there is a seat.
  function addPassenger(person: Passenger) {
    const chosen = getValues("passengerIds");
    if (chosen.length < count) setValue("passengerIds", [...chosen, person.id]);
  }

  const send = useMutation({
    mutationFn: ({
      values,
      expectedTotalMinor,
      cancellationTermsVersion,
      offerUpdatedAt,
    }: Attempt) => {
      const body: Body = {
        emptyLegId: offer.id,
        passengerCount: values.passengerCount,
        expectedTotalMinor,
        currency: "INR",
        cancellationTermsVersion,
        offerUpdatedAt,
        passengerIds: values.passengerIds,
        ...(values.specialRequests
          ? { specialRequests: values.specialRequests }
          : {}),
      };
      return apiFetch<Created>("bookings/empty-leg", {
        method: "POST",
        headers: { "Idempotency-Key": attempt.keyFor(body) },
        body,
      });
    },
    onSuccess: async ({ data }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tripsAll });
      await queryClient.invalidateQueries({ queryKey: queryKeys.emptyLegsAll });
      router.push(`/account/trips/${data.reference}`);
    },
    onError: async (failure, sent) => {
      if (!(failure instanceof ApiError && failure.status === 0)) {
        attempt.rotate();
      }
      setLast(sent);
      const estimate = newEstimateFrom(failure);
      setChanged(estimate);
      setNewTerms(newTermsFrom(failure));
      const message = applyApiError(failure, setFieldError, [
        "passengerCount",
        "passengerIds",
        "specialRequests",
      ]);
      setError(
        failure instanceof ApiError && failure.code === "BOOKING_UNAVAILABLE"
          ? "This empty leg is no longer available: it has ended, been taken or the aircraft is no longer free. Other empty legs may suit you."
          : failure instanceof ApiError && failure.code === "BOOKING_DUPLICATE"
            ? "You have already requested this empty leg. Find it under your trips."
            : failure instanceof ApiError &&
                failure.code === "BOOKING_PRICE_CHANGED" &&
                !estimate
              ? "The operator has changed this offer since you opened it. Read the seats, window and conditions below again, then send your request."
              : message,
      );
      // The offer moved on (taken, changed or ended): show it as it is now,
      // so the next attempt sends its new `updatedAt`.
      if (failure instanceof ApiError && failure.status === 409) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.emptyLeg(offer.id),
        });
      }
    },
  });

  const started = now > 0 && new Date(offer.departureFrom).getTime() <= now;
  const closed =
    offer.status !== "PUBLISHED" ||
    (now > 0 && isLapsed(offer, now)) ||
    started;

  function submit(
    expected: number,
    version: number = offer.cancellationTerms.version,
  ) {
    return handleSubmit((values) => {
      setError(null);
      setChanged(null);
      setNewTerms(null);
      send.mutate({
        values,
        expectedTotalMinor: expected,
        cancellationTermsVersion: version,
        offerUpdatedAt: offer.updatedAt,
      });
    });
  }

  return (
    <form
      noValidate
      className="mx-auto flex max-w-reading flex-col gap-8"
      onSubmit={(event) => void submit(offer.price.amountMinor)(event)}
    >
      <div className="flex flex-col gap-2">
        <Link
          href={`/empty-legs/${offer.id}`}
          className="text-body-sm text-accent hover:underline"
        >
          Back to the offer
        </Link>
        <h1 className="text-h3 md:text-h2">Request this empty leg</h1>
        <p className="text-body text-muted">
          {aircraftLabel(offer)} · operated by {offer.operatorName}
          <br />
          {routeLabel(offer)} · {windowLabel(offer)}
        </p>
        <p className="text-body-sm text-muted">
          The operator confirms the departure time within this window.
        </p>
      </div>

      <Card className="flex flex-col gap-2">
        <PriceLabel
          amountMinor={offer.price.amountMinor}
          currency={offer.price.currency}
          priceType={offer.price.priceType}
          validUntil={offer.validUntil}
          expired={closed}
        />
        <p className="text-body-sm text-muted">
          The price for the aircraft, whoever flies. It is final once the
          operator accepts your request.
        </p>
      </Card>

      {closed ? (
        <p role="status" className="text-body-sm text-danger">
          This offer is no longer open, so it cannot be requested.
        </p>
      ) : null}

      <Controller
        control={control}
        name="passengerCount"
        render={({ field }) => (
          <Select
            label="People flying"
            name={field.name}
            value={field.value}
            onValueChange={field.onChange}
            error={errors.passengerCount?.message}
            options={Array.from({ length: seats }, (_, i) => ({
              value: String(i + 1),
              label: String(i + 1),
            }))}
          />
        )}
      />

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
              Choose the lead passenger and up to {Math.max(count - 1, 0)} more.
            </p>
            <Controller
              control={control}
              name="passengerIds"
              render={({ field }) => (
                <>
                  {people.map((person) => (
                    <Checkbox
                      key={person.id}
                      label={`${person.firstName} ${person.lastName}`}
                      checked={field.value.includes(person.id)}
                      onCheckedChange={(value) =>
                        field.onChange(
                          value === true
                            ? [...field.value, person.id]
                            : field.value.filter((pid) => pid !== person.id),
                        )
                      }
                    />
                  ))}
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

      <section className="flex flex-col gap-2" aria-labelledby="el-conditions">
        <h2 id="el-conditions" className="text-title">
          The operator&apos;s conditions
        </h2>
        <p className="whitespace-pre-line text-body-sm text-muted">
          {offer.conditions}
        </p>
      </section>

      {newTerms ? null : (
        <CancellationTerms
          headingLevel={2}
          summary={offer.cancellationTerms.summary}
          charges={offer.cancellationTerms.tiers}
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
                void submit(
                  last?.expectedTotalMinor ?? offer.price.amountMinor,
                  newTerms.version,
                )(event)
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
            disabled={closed}
            className="self-start"
          >
            Send request
          </Button>
        )}
        <p className="text-caption text-muted">
          This sends a request. Nothing is booked or charged. The operator
          confirms the flight and the price first.
        </p>
      </div>
    </form>
  );
}
