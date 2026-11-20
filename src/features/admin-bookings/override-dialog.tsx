"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { CancellationTerms } from "@/components/shared/cancellation-terms";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { applyApiError } from "@/lib/api/messages";
import type { Schemas } from "@/lib/api/types";
import { STATUS_LABELS, STATUSES } from "./filters";
import { overrideSchema, type OverrideValues } from "./schema";

type Detail = Schemas["AdminBookingDetailDto"];

/**
 * Operations' manual status change, with a mandatory reason that goes on the
 * timeline and into the audit trail. The API checks the move; to CANCELLED it
 * applies the booking's cancellation terms and records the refund due.
 */
export function OverrideDialog({
  booking,
  open,
  onOpenChange,
}: {
  booking: Detail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Override the status"
        description="Use this when the normal flow cannot move the booking. The reason is kept on the timeline and in the audit record."
      >
        {/* Mounted only while open, so the form starts empty. */}
        <OverrideForm booking={booking} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function OverrideForm({
  booking,
  onClose,
}: {
  booking: Detail;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<OverrideValues>({
    resolver: zodResolver(overrideSchema),
    defaultValues: { status: "", reason: "" },
  });
  const target = useWatch({ control, name: "status" });

  const override = useMutation({
    mutationFn: (values: OverrideValues) =>
      apiFetch(`admin/bookings/${booking.reference}/status`, {
        method: "PATCH",
        body: { status: values.status, reason: values.reason.trim() },
      }),
    onSuccess: async () => {
      toast({ title: "Status changed", tone: "success" });
      onClose();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.adminBookingsAll,
      });
    },
    onError: async (failure) => {
      setError(applyApiError(failure, setFieldError, ["status", "reason"]));
      // A conflict means the booking moved: show it as it is now.
      if (failure instanceof ApiError && failure.status === 409) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.adminBookingsAll,
        });
      }
    },
  });

  const options = STATUSES.filter((status) => status !== booking.status).map(
    (status) => ({ value: status, label: STATUS_LABELS[status] }),
  );

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        setError(null);
        void handleSubmit((values) => override.mutate(values))(event);
      }}
    >
      <FormAlert message={error} />
      <Controller
        control={control}
        name="status"
        render={({ field }) => (
          <Select
            label="New status"
            options={options}
            placeholder="Choose a status"
            value={field.value}
            onValueChange={field.onChange}
            name={field.name}
            error={errors.status?.message}
          />
        )}
      />
      {target === "CANCELLED" ? (
        <div className="flex flex-col gap-2 rounded-lg bg-surface p-4">
          <CancellationTerms
            summary={booking.cancellationTerms.summary}
            charges={booking.cancellationTerms.charges}
          />
          <p className="text-body-sm text-muted">
            Cancelling applies these terms to the time left before departure and
            records the refund due, as for a customer&apos;s own cancellation.
          </p>
        </div>
      ) : null}
      <Textarea
        label="Reason"
        hint="Never put passenger or medical details here."
        rows={3}
        maxLength={500}
        error={errors.reason?.message}
        {...register("reason")}
      />
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary" className="h-10">
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="submit"
          variant={target === "CANCELLED" ? "destructive" : "primary"}
          className="h-10"
          loading={override.isPending}
        >
          Change status
        </Button>
      </DialogFooter>
    </form>
  );
}
