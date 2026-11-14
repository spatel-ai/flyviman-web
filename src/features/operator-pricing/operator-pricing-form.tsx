"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { LoadError } from "@/components/shared/load-error";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { applyApiError } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import {
  fromOperatorPricing,
  OPERATOR_PRICING_ALIASES,
  operatorPricingSchema,
  toOperatorPricingBody,
  type OperatorPricingValues,
} from "./schema";

type Pricing = Schemas["OperatorPricingResponseDto"];

/** Fields the API may name in a validation error, mapped to form fields. */
const FIELDS = ["minBillableHours", "freeWithinKm"] as const;

/**
 * Defaults that apply to every aircraft of the organisation unless an
 * aircraft sets its own. Each save is a new version, kept for audit
 * (business rule 6); estimates already shown keep the values they used.
 */
export function OperatorPricingForm() {
  const pricing = useQuery({
    queryKey: queryKeys.operatorPricing,
    queryFn: () => apiFetch<Pricing>("operator/pricing"),
  });
  if (pricing.isPending) return <Skeleton className="mt-6 h-96" />;
  if (pricing.isError) {
    return (
      <LoadError
        what="your pricing"
        error={pricing.error}
        onRetry={() => void pricing.refetch()}
      />
    );
  }
  return <Editor initial={fromOperatorPricing(pricing.data.data)} />;
}

function Editor({ initial }: { initial: OperatorPricingValues }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<OperatorPricingValues>({
    resolver: zodResolver(operatorPricingSchema),
    defaultValues: initial,
  });
  const save = useMutation({
    mutationFn: (values: OperatorPricingValues) =>
      apiFetch<Pricing>("operator/pricing", {
        method: "PUT",
        body: toOperatorPricingBody(values),
      }),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(queryKeys.operatorPricing, { data });
      reset(fromOperatorPricing(data));
      toast({ title: "Pricing saved", tone: "success" });
    },
    onError: (error) =>
      setFormError(
        applyApiError(error, setError, FIELDS, OPERATOR_PRICING_ALIASES),
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
      className="mt-6 flex max-w-reading flex-col gap-6"
    >
      <FormAlert message={formError} />
      <Card variant="raised" className="flex flex-col gap-5">
        <h2 className="text-title">Flight time</h2>
        <Input
          label="Minimum billable hours"
          hint="Charged per flight even when it is shorter. Leave empty for Flyviman's default."
          inputMode="decimal"
          error={errors.minBillableHours?.message}
          {...register("minBillableHours")}
        />
      </Card>
      <Card variant="raised" className="flex flex-col gap-5">
        <h2 className="text-title">Positioning</h2>
        <p className="text-body-sm text-muted">
          Flying to the customer&apos;s airport and back to base, charged as a
          share of the aircraft&apos;s hourly rate.
        </p>
        <Input
          label="Positioning rate (% of hourly rate)"
          inputMode="decimal"
          error={errors.positioningPercent?.message}
          {...register("positioningPercent")}
        />
        <Input
          label="Free positioning distance (km)"
          hint="Positioning within this distance is not charged."
          inputMode="numeric"
          error={errors.freeWithinKm?.message}
          {...register("freeWithinKm")}
        />
      </Card>
      <Card variant="raised" className="flex flex-col gap-5">
        <h2 className="text-title">Airport charges you assume</h2>
        <p className="text-body-sm text-muted">
          Used only where Flyviman has no charges on record for an airport.
        </p>
        <Input
          label="Landing charge (₹)"
          inputMode="decimal"
          error={errors.landingFallback?.message}
          {...register("landingFallback")}
        />
        <Input
          label="Handling charge per stop (₹)"
          inputMode="decimal"
          error={errors.handlingFallback?.message}
          {...register("handlingFallback")}
        />
      </Card>
      <div>
        <Button type="submit" loading={save.isPending} disabled={!isDirty}>
          Save pricing
        </Button>
      </div>
    </form>
  );
}
