"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { LoadError } from "@/components/shared/load-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { LocationField } from "@/components/shared/location-field";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { applyApiError } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import {
  AIRCRAFT_PRICING_ALIASES,
  aircraftPricingSchema,
  fromAircraftPricing,
  MAX_FIXED_ROUTES,
  toAircraftPricingBody,
  type AircraftPricingValues,
  type PricingModel,
} from "./pricing-schema";

type Pricing = Schemas["AircraftPricingResponseDto"];

/**
 * The aircraft's hourly rate, for the organisation's administrator. Without
 * one, customers see the aircraft as "price on request". Each save is a new
 * version, kept for audit (business rule 6).
 */
export function AircraftPricing({
  aircraftId,
  model,
}: {
  aircraftId: string;
  /** How the aircraft is priced (set in its details). */
  model: PricingModel;
}) {
  const pricing = useQuery({
    queryKey: queryKeys.aircraftPricing(aircraftId),
    queryFn: () =>
      apiFetch<Pricing>(
        `operator/aircraft/${encodeURIComponent(aircraftId)}/pricing`,
      ),
  });
  return (
    <section aria-labelledby="aircraft-pricing" className="flex flex-col gap-4">
      <h2 id="aircraft-pricing" className="text-title">
        Pricing
      </h2>
      {pricing.isPending ? (
        <Skeleton className="h-48" />
      ) : pricing.isError ? (
        <LoadError
          what="this aircraft's pricing"
          error={pricing.error}
          onRetry={() => void pricing.refetch()}
        />
      ) : (
        <Editor
          aircraftId={aircraftId}
          model={model}
          initial={pricing.data.data}
        />
      )}
    </section>
  );
}

const FIELDS = ["minBillableHours", "minBillableHoursPer"] as const;

const MINIMUM_PER = [
  { value: "LEG", label: "Per flight" },
  { value: "DAY", label: "Per day" },
];

function Editor({
  aircraftId,
  model,
  initial,
}: {
  aircraftId: string;
  model: PricingModel;
  initial: Pricing;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<AircraftPricingValues>({
    resolver: zodResolver(aircraftPricingSchema),
    defaultValues: fromAircraftPricing(initial),
  });
  const routes = useFieldArray({ control, name: "routes" });
  const missingPrice =
    model === "HOURLY"
      ? initial.hourlyRateMinor == null
      : model === "SECTOR"
        ? initial.sectorRateMinor == null
        : (initial.fixedRoutes ?? []).length === 0;
  const save = useMutation({
    mutationFn: (values: AircraftPricingValues) =>
      apiFetch<Pricing>(
        `operator/aircraft/${encodeURIComponent(aircraftId)}/pricing`,
        {
          method: "PUT",
          body: toAircraftPricingBody(values, model),
        },
      ),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(queryKeys.aircraftPricing(aircraftId), { data });
      reset(fromAircraftPricing(data));
      toast({ title: "Aircraft pricing saved", tone: "success" });
    },
    onError: (error) =>
      setFormError(
        applyApiError(error, setError, FIELDS, AIRCRAFT_PRICING_ALIASES),
      ),
  });

  return (
    <form
      noValidate
      onSubmit={(event) =>
        void handleSubmit((values) => {
          setFormError(null);
          save.mutate(values);
        })(event)
      }
      className="flex max-w-reading flex-col gap-4"
    >
      {missingPrice ? (
        <p className="text-body-sm text-muted">
          {model === "HOURLY"
            ? "No rate yet"
            : model === "SECTOR"
              ? "No price yet"
              : "No routes yet"}
          : customers see this aircraft as &ldquo;price on request&rdquo;.
        </p>
      ) : null}
      <FormAlert message={formError} />
      {model === "HOURLY" ? (
        <Input
          label="Hourly rate (₹)"
          hint="Leave empty to price this aircraft on request."
          inputMode="decimal"
          error={errors.hourlyRate?.message}
          {...register("hourlyRate")}
        />
      ) : null}
      {model === "SECTOR" ? (
        <Input
          label="Price per flight (₹)"
          hint="One price for each flight of the customer. Leave empty to price this aircraft on request."
          inputMode="decimal"
          error={errors.sectorRate?.message}
          {...register("sectorRate")}
        />
      ) : null}
      {model === "FIXED_ROUTE" ? (
        <fieldset className="flex min-w-0 flex-col gap-4">
          <legend className="text-body font-medium">Fixed routes</legend>
          <p className="text-body-sm text-muted">
            A price per flight on each route, the same in either direction.
            Trips on other routes are priced on request.
          </p>
          {routes.fields.map((field, index) => (
            <div
              key={field.id}
              role="group"
              aria-label={`Route ${index + 1}`}
              className="flex min-w-0 flex-col gap-3 rounded-md bg-surface p-4 [&>*]:min-w-0"
            >
              <Controller
                control={control}
                name={`routes.${index}.originId`}
                render={({ field: input }) => (
                  <LocationField
                    label={`Route ${index + 1} from`}
                    searchLabel={`Find route ${index + 1} start`}
                    value={input.value}
                    onChange={input.onChange}
                    error={errors.routes?.[index]?.originId?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name={`routes.${index}.destinationId`}
                render={({ field: input }) => (
                  <LocationField
                    label={`Route ${index + 1} to`}
                    searchLabel={`Find route ${index + 1} end`}
                    value={input.value}
                    onChange={input.onChange}
                    error={errors.routes?.[index]?.destinationId?.message}
                  />
                )}
              />
              <Input
                label={`Route ${index + 1} price per flight (₹)`}
                inputMode="decimal"
                error={errors.routes?.[index]?.amount?.message}
                {...register(`routes.${index}.amount`)}
              />
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => routes.remove(index)}
                >
                  Remove route {index + 1}
                </Button>
              </div>
            </div>
          ))}
          {errors.routes?.message ? (
            <p role="alert" className="text-body-sm text-danger">
              {errors.routes.message}
            </p>
          ) : null}
          <div>
            <Button
              type="button"
              variant="secondary"
              disabled={routes.fields.length >= MAX_FIXED_ROUTES}
              onClick={() =>
                routes.append({ originId: "", destinationId: "", amount: "" })
              }
            >
              Add route
            </Button>
          </div>
        </fieldset>
      ) : null}
      <Controller
        control={control}
        name="taxInclusive"
        render={({ field }) => (
          <Checkbox
            label={
              model === "HOURLY"
                ? "The rate includes GST"
                : "The prices include GST"
            }
            checked={field.value}
            onCheckedChange={(checked) => field.onChange(checked === true)}
          />
        )}
      />
      <Controller
        control={control}
        name="commissionInclusive"
        render={({ field }) => (
          <Checkbox
            label={
              model === "HOURLY"
                ? "The rate includes Flyviman's commission"
                : "The prices include Flyviman's commission"
            }
            checked={field.value}
            onCheckedChange={(checked) => field.onChange(checked === true)}
          />
        )}
      />
      {model === "HOURLY" ? (
        <>
          <Input
            label="Minimum billable hours for this aircraft"
            hint="Overrides your organisation's default. Leave empty to use it."
            inputMode="decimal"
            error={errors.minBillableHours?.message}
            {...register("minBillableHours")}
          />
          <Controller
            control={control}
            name="minBillableHoursPer"
            render={({ field }) => (
              <Select
                label="The minimum applies"
                hint="Per day: the flights of a day together bill at least the minimum."
                options={MINIMUM_PER}
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
                error={errors.minBillableHoursPer?.message}
              />
            )}
          />
        </>
      ) : null}
      <div>
        <Button
          type="submit"
          variant="secondary"
          loading={save.isPending}
          disabled={!isDirty}
        >
          Save pricing
        </Button>
      </div>
    </form>
  );
}
