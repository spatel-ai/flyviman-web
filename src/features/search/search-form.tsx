"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { LocationField } from "@/components/shared/location-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api/client";
import { applyApiError } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import {
  CHARTER_CATEGORIES,
  searchSchema,
  toSearchBody,
  type SearchOutput,
  type SearchValues,
} from "./schema";

type SearchResponse = Schemas["SearchResponseDto"];

const FIELDS = [
  "originId",
  "destinationId",
  "passengerCount",
  "category",
] as const;

/** Charter or helicopter, one way. Results open on their own page. */
export function SearchForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SearchValues, unknown, SearchOutput>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      kind: "charter",
      originId: "",
      destinationId: "",
      // Chosen by the visitor: "today" is not known when the page is built.
      date: "",
      time: "10:00",
      passengerCount: "2",
      category: "ANY",
    },
  });
  const kind = useWatch({ control, name: "kind" });

  async function onSubmit(values: SearchOutput) {
    setFormError(null);
    try {
      const { data } = await apiFetch<SearchResponse>(`search/${values.kind}`, {
        method: "POST",
        body: toSearchBody(values),
      });
      queryClient.setQueryData(queryKeys.search(data.searchId), { data });
      router.push(`/search/${data.searchId}`);
    } catch (error) {
      setFormError(
        applyApiError(error, setError, FIELDS) ??
          "The search could not be run. Check the details and try again.",
      );
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-6"
    >
      <FormAlert message={formError} />
      <Controller
        control={control}
        name="kind"
        render={({ field }) => (
          <Select
            label="What would you like to fly?"
            value={field.value}
            onValueChange={field.onChange}
            options={[
              { value: "charter", label: "Private jet or turboprop" },
              { value: "helicopter", label: "Helicopter" },
            ]}
          />
        )}
      />
      <div className="grid gap-6 md:grid-cols-2 [&>*]:min-w-0">
        <Controller
          control={control}
          name="originId"
          render={({ field }) => (
            <LocationField
              label="From"
              searchLabel="Find where you fly from"
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
              label="To"
              searchLabel="Find where you fly to"
              value={field.value}
              onChange={field.onChange}
              error={errors.destinationId?.message}
            />
          )}
        />
      </div>
      <div className="grid gap-6 md:grid-cols-3 [&>*]:min-w-0">
        <Input
          label="Date"
          type="date"
          error={errors.date?.message}
          {...register("date")}
        />
        <Input
          label="Departure time (India)"
          type="time"
          error={errors.time?.message}
          {...register("time")}
        />
        <Input
          label="Passengers"
          type="number"
          inputMode="numeric"
          min={1}
          max={50}
          error={errors.passengerCount?.message}
          {...register("passengerCount")}
        />
      </div>
      {kind === "charter" ? (
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select
              label="Aircraft"
              value={field.value}
              onValueChange={field.onChange}
              options={CHARTER_CATEGORIES.map((c) => ({ ...c }))}
            />
          )}
        />
      ) : null}
      <div>
        <Button type="submit" size="lg" loading={isSubmitting}>
          Search aircraft
        </Button>
      </div>
    </form>
  );
}
