"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { LocationField } from "@/components/shared/location-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import { addDays, utcToLocal, zoneName } from "@/lib/format/zoned";
import type { Entry } from "./entries";
import { addableTypes, ENTRY_LABELS } from "./labels";
import {
  entrySchema,
  MAX_SOFT_HOLD_DAYS,
  toRequest,
  type EntryValues,
} from "./schema";

/** API field names mapped to the form's own fields. */
const API_FIELDS: Record<string, keyof EntryValues> = {
  startsAt: "startDate",
  endsAt: "endDate",
  expiresAt: "expiresDate",
  originId: "originId",
  note: "note",
};

export interface EntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aircraftId: string;
  registration: string;
  zone: string;
  /** Approved operators may offer time; others may only ground (D-058). */
  approved: boolean;
  /** The day to start on when adding. */
  day?: string;
  /** A slot being changed. Blocks cannot be changed, only removed. */
  slot?: Entry;
}

function defaults(
  day: string | undefined,
  slot: Entry | undefined,
  zone: string,
) {
  if (slot) {
    const start = utcToLocal(slot.startsAt, zone);
    const end = utcToLocal(slot.endsAt, zone);
    return {
      type: slot.type as EntryValues["type"],
      startDate: start.date,
      startTime: start.time,
      endDate: end.date,
      endTime: end.time,
      originId: slot.originId ?? "",
      expiresDate: "",
      expiresTime: "",
      note: "",
    };
  }
  const date = day ?? "";
  return {
    type: "OPEN" as const,
    startDate: date,
    startTime: "09:00",
    endDate: date,
    endTime: "17:00",
    originId: "",
    expiresDate: date ? addDays(date, -1) : "",
    expiresTime: "18:00",
    note: "",
  };
}

/** Adds a slot or block, or changes a slot, in the aircraft's local time. */
export function EntryDialog(props: EntryDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <EntryForm {...props} /> : null}
    </Dialog>
  );
}

function EntryForm({
  onOpenChange,
  aircraftId,
  registration,
  zone,
  approved,
  day,
  slot,
}: EntryDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EntryValues>({
    resolver: zodResolver(entrySchema(zone)),
    defaultValues: defaults(day, slot, zone),
  });
  const type = useWatch({ control, name: "type" });
  const types = slot
    ? (["OPEN", "DEPARTURE_SLOT"] as const)
    : addableTypes(approved);
  const zoneLabel = zoneName(zone);

  async function onSubmit(values: EntryValues) {
    setFormError(null);
    const request = toRequest(values, zone);
    const base = `operator/aircraft/${encodeURIComponent(aircraftId)}/availability`;
    try {
      if (slot) {
        await apiFetch(`${base}/slots/${encodeURIComponent(slot.id)}`, {
          method: "PATCH",
          body: request.body,
        });
      } else {
        await apiFetch(`${base}/${request.collection}`, {
          method: "POST",
          body: request.body,
        });
      }
      toast({
        title: slot ? "Slot changed" : `${ENTRY_LABELS[values.type]} added`,
        tone: "success",
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.availability,
      });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
        let placed = 0;
        for (const detail of error.details) {
          const field = detail.field ? API_FIELDS[detail.field] : undefined;
          if (field) {
            setError(field, { type: "server", message: detail.issue });
            placed += 1;
          }
        }
        if (placed === error.details.length && placed > 0) return;
      }
      setFormError(messageFor(error));
    }
  }

  return (
    <DialogContent
      title={slot ? `Change slot · ${registration}` : `Add to ${registration}`}
      description={`Times are in ${zoneLabel}, the aircraft's home base time.`}
    >
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        className="flex flex-col gap-4"
      >
        <FormAlert message={formError} />
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select
              label="Type"
              options={types.map((value) => ({
                value,
                label: ENTRY_LABELS[value],
              }))}
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
              hint={
                approved
                  ? undefined
                  : "Your organisation is not approved, so you can only block time."
              }
              error={errors.type?.message}
            />
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Start date"
            type="date"
            error={errors.startDate?.message}
            {...register("startDate")}
          />
          <Input
            label={`Start time (${zoneLabel})`}
            type="time"
            error={errors.startTime?.message}
            {...register("startTime")}
          />
          <Input
            label="End date"
            type="date"
            error={errors.endDate?.message}
            {...register("endDate")}
          />
          <Input
            label={`End time (${zoneLabel})`}
            type="time"
            error={errors.endTime?.message}
            {...register("endTime")}
          />
        </div>
        {type === "DEPARTURE_SLOT" ? (
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
        ) : null}
        {type === "SOFT_HOLD" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Hold lapses on"
              type="date"
              hint={`Within the next ${MAX_SOFT_HOLD_DAYS} days.`}
              error={errors.expiresDate?.message}
              {...register("expiresDate")}
            />
            <Input
              label={`Lapses at (${zoneLabel})`}
              type="time"
              error={errors.expiresTime?.message}
              {...register("expiresTime")}
            />
          </div>
        ) : null}
        {slot || type === "OPEN" || type === "DEPARTURE_SLOT" ? null : (
          <Input
            label="Note (optional)"
            hint="Seen only by your organisation."
            error={errors.note?.message}
            {...register("note")}
          />
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" loading={isSubmitting}>
            {slot ? "Save changes" : "Add"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
