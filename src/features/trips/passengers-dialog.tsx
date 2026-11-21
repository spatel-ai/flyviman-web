"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { EmptyState } from "@/components/shared/empty-state";
import { FormAlert } from "@/components/shared/form-alert";
import { LoadError } from "@/components/shared/load-error";
import { Button } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/button-classes";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { applyApiError } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { useAttemptKey } from "@/lib/idempotency";
import { passengersSchema, type PassengersValues } from "./schema";

type Passenger = Schemas["PassengerResponseDto"];

/**
 * Statuses in which the API takes a new passenger list (requested up to
 * confirmed). Only a hint for showing the button: the API decides, and it
 * also locks the list close to departure.
 */
const EDITABLE: ReadonlySet<string> = new Set([
  "REQUESTED",
  "OPERATOR_PENDING",
  "CLARIFICATION_REQUESTED",
  "PRICE_CONFIRMED",
  "AWAITING_PAYMENT",
  "CONFIRMED",
]);

export function canEditPassengers(status: string): boolean {
  return EDITABLE.has(status);
}

/** Choose who flies from the saved passengers; replaces the trip's list. */
export function PassengersDialog({
  reference,
  limit,
  open,
  onOpenChange,
}: {
  reference: string;
  limit: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Who is flying"
        description="Choose everyone who will fly, the lead passenger first. This replaces the passengers on the trip."
      >
        <PassengersBody
          reference={reference}
          limit={limit}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

// Mounted only while open, so the saved passengers are read afresh.
function PassengersBody({
  reference,
  limit,
  onClose,
}: {
  reference: string;
  limit: number;
  onClose: () => void;
}) {
  const people = useQuery({
    queryKey: queryKeys.passengers,
    queryFn: async () => (await apiFetch<Passenger[]>("me/passengers")).data,
  });

  if (people.isPending) {
    return (
      <div role="status" aria-label="Loading your saved passengers">
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (people.isError) {
    return (
      <LoadError
        what="your saved passengers"
        error={people.error}
        onRetry={() => void people.refetch()}
      />
    );
  }
  if (people.data.length === 0) {
    return (
      <EmptyState
        title="No saved passengers"
        description="Add the people who will fly to your account, then come back to this trip."
        action={
          <Link href="/account/passengers" className={buttonClasses({})}>
            Add a passenger
          </Link>
        }
      />
    );
  }
  return (
    <PassengersForm
      reference={reference}
      limit={limit}
      people={people.data}
      onClose={onClose}
    />
  );
}

function PassengersForm({
  reference,
  limit,
  people,
  onClose,
}: {
  reference: string;
  limit: number;
  people: Passenger[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const attempt = useAttemptKey();
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<PassengersValues>({
    resolver: zodResolver(passengersSchema(limit)),
    defaultValues: { passengerIds: [] },
  });

  const save = useMutation({
    mutationFn: (values: PassengersValues) => {
      const body = { passengerIds: values.passengerIds };
      return apiFetch(`bookings/${encodeURIComponent(reference)}/passengers`, {
        method: "PUT",
        headers: { "Idempotency-Key": attempt.keyFor(body) },
        body,
      });
    },
    onSuccess: async () => {
      attempt.rotate();
      toast({ title: "Passengers updated", tone: "success" });
      onClose();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.booking(reference),
      });
    },
    onError: async (failure) => {
      // Only a lost answer keeps the key, so a retry is the same change.
      if (!(failure instanceof ApiError && failure.status === 0)) {
        attempt.rotate();
      }
      setError(applyApiError(failure, setFieldError, ["passengerIds"]));
      if (failure instanceof ApiError && failure.status === 409) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.booking(reference),
        });
      }
    },
  });

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        setError(null);
        void handleSubmit((values) => save.mutate(values))(event);
      }}
    >
      <FormAlert message={error} />
      <fieldset className="flex flex-col gap-3">
        <legend className="text-body-sm text-muted">
          Choose the lead passenger and up to {limit - 1} more.
        </legend>
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
                        : field.value.filter((id) => id !== person.id),
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
      </fieldset>
      <p className="text-caption text-muted">
        Details are copied from your saved passengers as they are now. To
        correct someone&apos;s details, edit them under your passengers first.
      </p>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary">Keep as it is</Button>
        </DialogClose>
        <Button type="submit" loading={save.isPending}>
          Save passengers
        </Button>
      </DialogFooter>
    </form>
  );
}
