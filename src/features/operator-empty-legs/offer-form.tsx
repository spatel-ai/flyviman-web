"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { LocationField } from "@/components/shared/location-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import type {
  EmptyLegAircraft,
  OperatorEmptyLeg,
} from "@/features/empty-legs/types";
import { apiFetch } from "@/lib/api/client";
import { applyApiError } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import {
  EMPTY_LEG_ALIASES,
  EMPTY_VALUES,
  emptyLegSchema,
  toEmptyLegBody,
  type EmptyLegValues,
} from "./schema";

type Aircraft = EmptyLegAircraft;
type Location = Schemas["LocationResponseDto"];

const FIELDS = [
  "aircraftId",
  "originId",
  "destinationId",
  "seatsAvailable",
  "price",
  "conditions",
] as const;

/**
 * Creates an offer, or edits one that is still a draft or was sent back.
 * Times are the departure airport's local time. Only approved aircraft are
 * offered (business rule 4); the API checks again.
 */
export function OfferForm({
  offer,
  initial = EMPTY_VALUES,
}: {
  /** The offer being edited; absent when creating. */
  offer?: OperatorEmptyLeg;
  initial?: EmptyLegValues;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EmptyLegValues>({
    resolver: zodResolver(emptyLegSchema),
    defaultValues: initial,
  });

  const fleet = useQuery({
    queryKey: [...queryKeys.operatorEmptyLegs, "aircraft"] as const,
    queryFn: () => apiFetch<Aircraft[]>("operator/empty-legs/aircraft"),
  });
  // The API lists only approved aircraft within the caller's reach.
  const approved = fleet.data?.data ?? [];
  const originId = useWatch({ control, name: "originId" });
  const origin = useQuery({
    queryKey: queryKeys.location(originId),
    queryFn: () =>
      apiFetch<Location>(`locations/${encodeURIComponent(originId)}`),
    enabled: Boolean(originId),
  });
  const zone = origin.data?.data.timeZone;

  const save = useMutation({
    mutationFn: (body: ReturnType<typeof toEmptyLegBody>) =>
      offer
        ? apiFetch<OperatorEmptyLeg>(
            `operator/empty-legs/${encodeURIComponent(offer.id)}`,
            { method: "PATCH", body },
          )
        : apiFetch<OperatorEmptyLeg>("operator/empty-legs", {
            method: "POST",
            body,
          }),
    onSuccess: async ({ data }) => {
      toast({ title: offer ? "Offer saved" : "Draft saved", tone: "success" });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.operatorEmptyLegs,
      });
      router.push(`/operator/empty-legs/${encodeURIComponent(data.id)}`);
    },
    onError: (error) =>
      setFormError(applyApiError(error, setError, FIELDS, EMPTY_LEG_ALIASES)),
  });

  return (
    <form
      noValidate
      onSubmit={(event) =>
        void handleSubmit((values) => {
          setFormError(null);
          if (!zone) {
            setError("originId", {
              message:
                "Wait for the departure airport to load, then try again.",
            });
            return;
          }
          const capacity = approved.find(
            (item) => item.id === values.aircraftId,
          )?.seats;
          if (
            capacity !== undefined &&
            Number(values.seatsAvailable) > capacity
          ) {
            setError("seatsAvailable", {
              message: `This aircraft seats ${capacity}.`,
            });
            return;
          }
          save.mutate(toEmptyLegBody(values, zone));
        })(event)
      }
      className="flex max-w-reading flex-col gap-5"
    >
      <FormAlert message={formError} />
      <Controller
        control={control}
        name="aircraftId"
        render={({ field }) => (
          <Select
            label="Aircraft"
            placeholder={
              fleet.isPending
                ? "Loading aircraft"
                : "Choose an approved aircraft"
            }
            hint={
              fleet.isSuccess && approved.length === 0
                ? "You have no approved aircraft yet. Offers need one."
                : undefined
            }
            options={approved.map((item) => ({
              value: item.id,
              label: `${item.registration} · ${item.type}`,
            }))}
            value={field.value}
            onValueChange={field.onChange}
            error={errors.aircraftId?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="originId"
        render={({ field }) => (
          <LocationField
            label="Departs from"
            searchLabel="Find the departure airport"
            value={field.value}
            onChange={field.onChange}
            error={errors.originId?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="destinationId"
        render={({ field }) => (
          <LocationField
            label="Arrives at"
            searchLabel="Find the arrival airport"
            value={field.value}
            onChange={field.onChange}
            error={errors.destinationId?.message}
          />
        )}
      />
      <p className="text-body-sm text-muted">
        {zone
          ? `Times are in the departure airport's time (${zone}).`
          : "Choose the departure airport to set the time zone for the times below."}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Earliest departure, day"
          type="date"
          error={errors.fromDay?.message}
          {...register("fromDay")}
        />
        <Input
          label="Earliest departure, time"
          type="time"
          error={errors.fromTime?.message}
          {...register("fromTime")}
        />
        <Input
          label="Latest departure, day"
          type="date"
          error={errors.toDay?.message}
          {...register("toDay")}
        />
        <Input
          label="Latest departure, time"
          type="time"
          error={errors.toTime?.message}
          {...register("toTime")}
        />
      </div>
      <Input
        label="Seats available"
        inputMode="numeric"
        error={errors.seatsAvailable?.message}
        {...register("seatsAvailable")}
      />
      <Input
        label="Price (₹)"
        hint="For the whole offer, in rupees."
        inputMode="decimal"
        error={errors.price?.message}
        {...register("price")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Offer valid until, day"
          type="date"
          error={errors.validDay?.message}
          {...register("validDay")}
        />
        <Input
          label="Offer valid until, time"
          type="time"
          error={errors.validTime?.message}
          {...register("validTime")}
        />
      </div>
      <Textarea
        label="Conditions"
        hint="Shown to customers before they ask about the flight: changes, cancellation, baggage."
        error={errors.conditions?.message}
        {...register("conditions")}
      />
      <div>
        <Button type="submit" loading={save.isPending}>
          {offer ? "Save changes" : "Save draft"}
        </Button>
      </div>
    </form>
  );
}
