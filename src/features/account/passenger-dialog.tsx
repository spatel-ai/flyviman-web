"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import {
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
import { COUNTRIES } from "@/lib/countries";
import {
  DOCUMENT_TYPES,
  EMPTY_PASSENGER,
  GENDERS,
  NONE,
  passengerSchema,
  toPassengerBody,
  toPassengerValues,
  type PassengerValues,
} from "./schema";

type Passenger = Schemas["PassengerResponseDto"];

const NATIONALITIES = [{ value: NONE, label: "Not specified" }, ...COUNTRIES];
const FIELDS = [
  "firstName",
  "lastName",
  "dateOfBirth",
  "gender",
  "nationality",
  "documentType",
  "documentNumber",
  "documentExpiry",
  "specialAssistance",
] as const;

// Mounted only while the dialog is open, so it always starts from the
// passenger being edited (or empty, for a new one).
function PassengerForm({
  passenger,
  onSaved,
}: {
  passenger: Passenger | null;
  onSaved: (passenger: Passenger) => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PassengerValues>({
    resolver: zodResolver(passengerSchema),
    defaultValues: passenger ? toPassengerValues(passenger) : EMPTY_PASSENGER,
  });
  const hasDocument = useWatch({ control, name: "documentType" }) !== NONE;

  async function onSubmit(values: PassengerValues) {
    setFormError(null);
    try {
      const { data } = await apiFetch<Passenger>(
        passenger ? `me/passengers/${passenger.id}` : "me/passengers",
        { method: passenger ? "PATCH" : "POST", body: toPassengerBody(values) },
      );
      onSaved(data);
    } catch (error) {
      setFormError(applyApiError(error, setError, FIELDS));
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      <FormAlert message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="First name"
          error={errors.firstName?.message}
          {...register("firstName")}
        />
        <Input
          label="Last name"
          error={errors.lastName?.message}
          {...register("lastName")}
        />
        <Input
          label="Date of birth"
          type="date"
          error={errors.dateOfBirth?.message}
          {...register("dateOfBirth")}
        />
        <Controller
          control={control}
          name="gender"
          render={({ field }) => (
            <Select
              label="Gender"
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
              options={[...GENDERS]}
            />
          )}
        />
        <Controller
          control={control}
          name="nationality"
          render={({ field }) => (
            <Select
              label="Nationality"
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
              options={NATIONALITIES}
            />
          )}
        />
        <Controller
          control={control}
          name="documentType"
          render={({ field }) => (
            <Select
              label="Identity document"
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
              options={[...DOCUMENT_TYPES]}
            />
          )}
        />
        {hasDocument ? (
          <>
            <Input
              label="Document number"
              autoComplete="off"
              hint="Stored encrypted."
              error={errors.documentNumber?.message}
              {...register("documentNumber")}
            />
            <Input
              label="Document expiry date"
              type="date"
              error={errors.documentExpiry?.message}
              {...register("documentExpiry")}
            />
          </>
        ) : null}
      </div>
      <Input
        label="Special assistance (optional)"
        hint="For example a wheelchair to the aircraft."
        error={errors.specialAssistance?.message}
        {...register("specialAssistance")}
      />
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary">Cancel</Button>
        </DialogClose>
        <Button type="submit" loading={isSubmitting}>
          {passenger ? "Save changes" : "Save passenger"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function PassengerDialog({
  open,
  onOpenChange,
  passenger,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The passenger to edit, or `null` to add one. */
  passenger: Passenger | null;
  onSaved: (passenger: Passenger) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={passenger ? "Edit passenger" : "Add a passenger"}
        description="Use the name exactly as it appears on the identity document they will travel with."
      >
        <PassengerForm passenger={passenger} onSaved={onSaved} />
      </DialogContent>
    </Dialog>
  );
}
