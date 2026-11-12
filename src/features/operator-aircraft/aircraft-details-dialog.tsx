"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { FormAlert } from "@/components/shared/form-alert";
import { LocationField } from "@/components/shared/location-field";
import { Button } from "@/components/ui/button";
import {
  ConfirmDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api/client";
import { applyApiError } from "@/lib/api/messages";
import type { Schemas } from "@/lib/api/types";
import { CATEGORIES, wingFor } from "./categories";

type Aircraft = Schemas["AircraftResponseDto"];

const optionalWhole = (max: number) =>
  z.union([z.literal(""), z.coerce.number().int().min(1).max(max)]);

const detailsSchema = z.object({
  registration: z.string().trim().min(2, "Enter the registration").max(20),
  manufacturer: z.string().trim().min(1, "Enter the manufacturer").max(100),
  model: z.string().trim().min(1, "Enter the model").max(100),
  category: z.string().min(1),
  passengerCapacity: z.coerce
    .number({ error: "Enter the number of passengers" })
    .int()
    .min(1)
    .max(100),
  baggageCapacityKg: z.union([
    z.literal(""),
    z.coerce.number().int().min(0).max(50_000),
  ]),
  rangeKm: optionalWhole(20_000),
  cruiseSpeedKmh: optionalWhole(2000),
  homeBaseId: z.string(),
});

type DetailsInput = z.input<typeof detailsSchema>;
type DetailsValues = z.output<typeof detailsSchema>;

const FIELDS = [
  "registration",
  "manufacturer",
  "model",
  "category",
  "passengerCapacity",
  "baggageCapacityKg",
  "rangeKm",
  "cruiseSpeedKmh",
  "homeBaseId",
] as const;

function defaults(aircraft: Aircraft): DetailsInput {
  return {
    registration: aircraft.registration,
    manufacturer: aircraft.manufacturer,
    model: aircraft.model,
    category: aircraft.category,
    passengerCapacity: aircraft.passengerCapacity,
    baggageCapacityKg: aircraft.baggageCapacityKg ?? "",
    rangeKm: aircraft.rangeKm ?? "",
    cruiseSpeedKmh: aircraft.cruiseSpeedKmh ?? "",
    homeBaseId: aircraft.homeBaseId ?? "",
  };
}

/** Only what changed, so an unchanged save sends nothing (D-058). */
function changes(values: DetailsValues, aircraft: Aircraft) {
  const next: Record<string, unknown> = {
    registration: values.registration.toUpperCase(),
    manufacturer: values.manufacturer,
    model: values.model,
    category: values.category,
    wingType: wingFor(values.category),
    passengerCapacity: values.passengerCapacity,
    baggageCapacityKg:
      values.baggageCapacityKg === "" ? null : values.baggageCapacityKg,
    rangeKm: values.rangeKm === "" ? null : values.rangeKm,
    cruiseSpeedKmh: values.cruiseSpeedKmh === "" ? null : values.cruiseSpeedKmh,
    homeBaseId: values.homeBaseId || aircraft.homeBaseId,
  };
  const current = aircraft as unknown as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(next).filter(([key, value]) => value !== current[key]),
  );
}

/**
 * Changes the aircraft's details. Every field here is reviewed, so on an
 * approved aircraft saving a change sends it back to review: say so first.
 */
export function AircraftDetailsDialog({
  aircraft,
  base,
  open,
  onOpenChange,
  onSaved,
}: {
  aircraft: Aircraft;
  base: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <DetailsForm
          aircraft={aircraft}
          base={base}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      ) : null}
    </Dialog>
  );
}

function DetailsForm({
  aircraft,
  base,
  onOpenChange,
  onSaved,
}: {
  aircraft: Aircraft;
  base: string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingBody, setPendingBody] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [saving, setSaving] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<DetailsInput, unknown, DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: defaults(aircraft),
  });

  async function save(body: Record<string, unknown>) {
    setSaving(true);
    setFormError(null);
    try {
      await apiFetch(base, { method: "PATCH", body });
      await onSaved();
      onOpenChange(false);
    } catch (error) {
      setPendingBody(null);
      setFormError(applyApiError(error, setError, FIELDS));
    } finally {
      setSaving(false);
    }
  }

  function onSubmit(values: DetailsValues) {
    const body = changes(values, aircraft);
    if (Object.keys(body).length === 0) {
      onOpenChange(false);
      return;
    }
    if (aircraft.listingStatus === "APPROVED") {
      setPendingBody(body);
      return;
    }
    void save(body);
  }

  return (
    <DialogContent
      title={`Edit ${aircraft.registration}`}
      description={
        aircraft.listingStatus === "APPROVED"
          ? "These details are reviewed. Saving a change sends the aircraft back to review, and it is not offered until operations approve it again."
          : undefined
      }
    >
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        className="flex flex-col gap-4"
      >
        <FormAlert message={formError} />
        <Input
          label="Registration"
          error={errors.registration?.message}
          {...register("registration")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Manufacturer"
            error={errors.manufacturer?.message}
            {...register("manufacturer")}
          />
          <Input
            label="Model"
            error={errors.model?.message}
            {...register("model")}
          />
        </div>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select
              label="Category"
              options={CATEGORIES}
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Passenger capacity"
            type="number"
            min={1}
            error={errors.passengerCapacity?.message}
            {...register("passengerCapacity")}
          />
          <Input
            label="Baggage (kg, optional)"
            type="number"
            min={0}
            error={errors.baggageCapacityKg?.message}
            {...register("baggageCapacityKg")}
          />
          <Input
            label="Range (km)"
            type="number"
            min={1}
            error={errors.rangeKm?.message}
            {...register("rangeKm")}
          />
          <Input
            label="Cruise speed (km/h, optional)"
            type="number"
            min={1}
            error={errors.cruiseSpeedKmh?.message}
            {...register("cruiseSpeedKmh")}
          />
        </div>
        <p className="text-body-sm text-muted">
          Home base: {aircraft.homeBase ? aircraft.homeBase.name : "not set"}.
          Search below only to change it.
        </p>
        <Controller
          control={control}
          name="homeBaseId"
          render={({ field }) => (
            <LocationField
              label="New home base"
              searchLabel="Find a new home base"
              value={field.value === aircraft.homeBaseId ? "" : field.value}
              onChange={(id) => field.onChange(id || aircraft.homeBaseId || "")}
              error={errors.homeBaseId?.message}
            />
          )}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" loading={saving}>
            Save changes
          </Button>
        </DialogFooter>
      </form>
      <ConfirmDialog
        open={pendingBody !== null}
        onOpenChange={(open) => !open && setPendingBody(null)}
        title="Send the aircraft back to review?"
        description="It is not offered to customers until operations approve the change."
        confirmLabel="Save and send for review"
        loading={saving}
        onConfirm={() => pendingBody && void save(pendingBody)}
      />
    </DialogContent>
  );
}
