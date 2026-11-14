"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { FormAlert } from "@/components/shared/form-alert";
import { LoadError } from "@/components/shared/load-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { applyApiError } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { paiseToRupees, rupeesToPaise } from "@/lib/format/money";

type Pricing = Schemas["AircraftPricingResponseDto"];

const parses = (value: string) => {
  try {
    rupeesToPaise(value);
    return true;
  } catch {
    return false;
  }
};

const schema = z.object({
  // The API takes ₹1 to ₹10 crore an hour; empty means "price on request".
  hourlyRate: z
    .string()
    .trim()
    .refine(parses, {
      message: "Enter the rate in rupees up to ₹10 crore, for example 180000.",
    })
    .refine(
      (value) => {
        try {
          const paise = rupeesToPaise(value);
          return paise === null || paise >= 100;
        } catch {
          return true;
        }
      },
      { message: "At least ₹1 an hour, or leave empty." },
    ),
  taxInclusive: z.boolean(),
  commissionInclusive: z.boolean(),
  minBillableHours: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (/^\d+(\.\d{1,2})?$/.test(value) &&
          Number(value) >= 0.5 &&
          Number(value) <= 12),
      { message: "Between 0.5 and 12 hours, or leave empty." },
    ),
});
type Values = z.infer<typeof schema>;

const FIELDS = ["minBillableHours"] as const;

function fromPricing(pricing: Pricing): Values {
  return {
    hourlyRate: paiseToRupees(pricing.hourlyRateMinor),
    taxInclusive: pricing.taxInclusive,
    commissionInclusive: pricing.commissionInclusive,
    minBillableHours:
      pricing.minBillableHours == null ? "" : String(pricing.minBillableHours),
  };
}

/**
 * The aircraft's hourly rate, for the organisation's administrator. Without
 * one, customers see the aircraft as "price on request". Each save is a new
 * version, kept for audit (business rule 6).
 */
export function AircraftPricing({ aircraftId }: { aircraftId: string }) {
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
        <Editor aircraftId={aircraftId} initial={pricing.data.data} />
      )}
    </section>
  );
}

function Editor({
  aircraftId,
  initial,
}: {
  aircraftId: string;
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
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: fromPricing(initial),
  });
  const save = useMutation({
    mutationFn: (values: Values) =>
      apiFetch<Pricing>(
        `operator/aircraft/${encodeURIComponent(aircraftId)}/pricing`,
        {
          method: "PUT",
          body: {
            hourlyRateMinor: rupeesToPaise(values.hourlyRate),
            taxInclusive: values.taxInclusive,
            commissionInclusive: values.commissionInclusive,
            minBillableHours:
              values.minBillableHours === ""
                ? null
                : Number(values.minBillableHours),
          },
        },
      ),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(queryKeys.aircraftPricing(aircraftId), { data });
      reset(fromPricing(data));
      toast({ title: "Aircraft pricing saved", tone: "success" });
    },
    onError: (error) =>
      setFormError(
        applyApiError(error, setError, FIELDS, {
          hourlyRateMinor: "hourlyRate",
        }),
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
      {initial.hourlyRateMinor == null ? (
        <p className="text-body-sm text-muted">
          No rate yet: customers see this aircraft as &ldquo;price on
          request&rdquo;.
        </p>
      ) : null}
      <FormAlert message={formError} />
      <Input
        label="Hourly rate (₹)"
        hint="Leave empty to price this aircraft on request."
        inputMode="decimal"
        error={errors.hourlyRate?.message}
        {...register("hourlyRate")}
      />
      <Controller
        control={control}
        name="taxInclusive"
        render={({ field }) => (
          <Checkbox
            label="The rate includes GST"
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
            label="The rate includes Flyviman's commission"
            checked={field.value}
            onCheckedChange={(checked) => field.onChange(checked === true)}
          />
        )}
      />
      <Input
        label="Minimum billable hours for this aircraft"
        hint="Overrides your organisation's default. Leave empty to use it."
        inputMode="decimal"
        error={errors.minBillableHours?.message}
        {...register("minBillableHours")}
      />
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
