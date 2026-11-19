"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { LocationField } from "@/components/shared/location-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { applyApiError } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import {
  fromRestrictions,
  MAX_EXCLUDED_LOCATIONS,
  RESTRICTION_ALIASES,
  restrictionsSchema,
  toRestrictions,
  type Restrictions,
  type RestrictionsValues,
} from "./schema";

const FIELDS = [
  "hoursStart",
  "hoursEnd",
  "excludedLocationIds",
  "noticeHours",
  "noticeMinutes",
] as const;

export interface RestrictionsEditorProps {
  initial: Restrictions | null;
  /** Replaces the whole set (null clears) and returns what was stored. */
  save: (restrictions: Restrictions | null) => Promise<Restrictions | null>;
  /** Who the restrictions bind, for the wording: "every aircraft of your organisation". */
  scope: string;
  disabled?: boolean;
}

/**
 * Operating hours, excluded locations and minimum notice. Used for the
 * organisation as a whole and for one aircraft. Restrictions only ever
 * narrow what customers can be offered; saving replaces the whole set.
 */
export function RestrictionsEditor({
  initial,
  save,
  scope,
  disabled,
}: RestrictionsEditorProps) {
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<RestrictionsValues>({
    resolver: zodResolver(restrictionsSchema),
    defaultValues: fromRestrictions(initial),
  });
  const mutation = useMutation({
    mutationFn: (values: RestrictionsValues) => save(toRestrictions(values)),
    onSuccess: (stored) => {
      reset(fromRestrictions(stored));
      toast({ title: "Restrictions saved", tone: "success" });
    },
    onError: (error) =>
      setFormError(applyApiError(error, setError, FIELDS, RESTRICTION_ALIASES)),
  });

  return (
    <form
      noValidate
      onSubmit={(event) =>
        void handleSubmit((values) => {
          setFormError(null);
          mutation.mutate(values);
        })(event)
      }
      className="flex max-w-reading flex-col gap-5"
    >
      <p className="text-body-sm text-muted">
        Limits on when and where {scope} can be offered. Leave a field empty for
        no limit.
      </p>
      <FormAlert message={formError} />
      <fieldset className="flex flex-col gap-3" disabled={disabled}>
        <legend className="text-body font-medium">Operating hours</legend>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Earliest departure or arrival"
            type="time"
            error={errors.hoursStart?.message}
            {...register("hoursStart")}
          />
          <Input
            label="Latest departure or arrival"
            type="time"
            error={errors.hoursEnd?.message}
            {...register("hoursEnd")}
          />
        </div>
        <p className="text-body-sm text-muted">
          Local time at each airport. If the latest time is before the earliest,
          the hours run past midnight: 22:00 to 06:00 means overnight.
        </p>
      </fieldset>
      <fieldset className="flex flex-col gap-3" disabled={disabled}>
        <legend className="text-body font-medium">Locations not served</legend>
        <Controller
          control={control}
          name="excludedLocationIds"
          render={({ field }) => (
            <ExcludedLocations
              ids={field.value}
              onChange={field.onChange}
              error={errors.excludedLocationIds?.message}
            />
          )}
        />
      </fieldset>
      <fieldset className="flex flex-col gap-3" disabled={disabled}>
        <legend className="text-body font-medium">Minimum notice</legend>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Notice (hours)"
            inputMode="numeric"
            error={errors.noticeHours?.message}
            {...register("noticeHours")}
          />
          <Input
            label="Notice (minutes)"
            inputMode="numeric"
            error={errors.noticeMinutes?.message}
            {...register("noticeMinutes")}
          />
        </div>
        <p className="text-body-sm text-muted">
          How long before departure you need a request, on top of
          Flyviman&apos;s own minimum. Up to 7 days.
        </p>
      </fieldset>
      <div>
        <Button
          type="submit"
          variant="secondary"
          loading={mutation.isPending}
          disabled={disabled || !isDirty}
        >
          Save restrictions
        </Button>
      </div>
    </form>
  );
}

function ExcludedLocations({
  ids,
  onChange,
  error,
}: {
  ids: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}) {
  const full = ids.length >= MAX_EXCLUDED_LOCATIONS;
  return (
    <>
      {ids.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {ids.map((id) => (
            <ExcludedLocation
              key={id}
              id={id}
              onRemove={() => onChange(ids.filter((item) => item !== id))}
            />
          ))}
        </ul>
      ) : (
        <p className="text-body-sm text-muted">No locations excluded.</p>
      )}
      {full ? (
        <p className="text-body-sm text-muted">
          You can exclude up to {MAX_EXCLUDED_LOCATIONS} locations.
        </p>
      ) : (
        <LocationField
          label="Add a location"
          searchLabel="Find a location to exclude"
          value=""
          onChange={(id) => {
            if (id && !ids.includes(id)) onChange([...ids, id]);
          }}
        />
      )}
      {error ? (
        <p role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      ) : null}
    </>
  );
}

function ExcludedLocation({
  id,
  onRemove,
}: {
  id: string;
  onRemove: () => void;
}) {
  const location = useQuery({
    queryKey: queryKeys.location(id),
    queryFn: () =>
      apiFetch<Schemas["LocationResponseDto"]>(
        `locations/${encodeURIComponent(id)}`,
      ),
  });
  const name = location.data
    ? location.data.data.name
    : location.isError
      ? "Unknown location"
      : "…";
  return (
    <li className="flex items-center justify-between gap-3">
      <span>{name}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2"
        onClick={onRemove}
        aria-label={`Remove ${name}`}
      >
        Remove
      </Button>
    </li>
  );
}
