"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ConfirmDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { applyApiError, messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { cancelSchema, type CancelValues } from "./schema";

type Detail = Schemas["OperatorBookingDetailDto"];
type Which = "schedule" | "complete" | "cancel";

/**
 * What the operator can do with the booking now, from the API's `actions`
 * flags (the API decides again on every call). A conflict (409: the booking
 * moved, a payment is still in flight) closes the dialog, shows on the page
 * and reloads the booking.
 */
export function BookingActions({ booking }: { booking: Detail }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState<Which | null>(null);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const base = `operator/bookings/${encodeURIComponent(booking.reference)}`;
  const { actions } = booking;

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.operatorBookingsAll,
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.operatorRequestsAll,
      }),
    ]);

  function show(which: Which) {
    setProblem(null);
    setOpen(which);
  }
  const close = (next: boolean) => {
    if (!next && !pending) setOpen(null);
  };

  async function move(status: "SCHEDULED" | "COMPLETED", done: string) {
    setPending(true);
    try {
      await apiFetch(`${base}/status`, { method: "PATCH", body: { status } });
      toast({ title: done, tone: "success" });
    } catch (error) {
      setProblem(messageFor(error));
    } finally {
      setPending(false);
      setOpen(null);
      await refresh();
    }
  }

  if (!actions.schedule && !actions.complete && !actions.cancel) {
    return <FormAlert message={problem} />;
  }

  return (
    <Card variant="raised" className="flex flex-col gap-4">
      <div>
        <h2 className="text-title">Trip status</h2>
        <p className="mt-1 text-body-sm text-muted">
          {actions.schedule
            ? "Mark the trip scheduled once crew, aircraft and slots are set."
            : actions.complete
              ? "Mark the trip completed now that it has flown."
              : booking.status === "SCHEDULED"
                ? "You can mark the trip completed once its last leg has departed."
                : "Cancel only if you cannot fly this trip."}
        </p>
      </div>
      <FormAlert message={problem} />
      <div className="flex flex-wrap gap-3">
        {actions.schedule ? (
          <Button className="h-11" onClick={() => show("schedule")}>
            Mark scheduled
          </Button>
        ) : null}
        {actions.complete ? (
          <Button className="h-11" onClick={() => show("complete")}>
            Mark completed
          </Button>
        ) : null}
        {actions.cancel ? (
          <Button
            variant="secondary"
            className="h-11"
            onClick={() => show("cancel")}
          >
            Cancel booking
          </Button>
        ) : null}
      </div>

      {open === "schedule" ? (
        <ConfirmDialog
          open
          onOpenChange={close}
          title="Mark this trip scheduled?"
          description="Confirms that the trip details are final: crew, aircraft and slots are arranged. This is recorded on the booking's timeline."
          confirmLabel="Mark scheduled"
          loading={pending}
          onConfirm={() => void move("SCHEDULED", "Trip marked scheduled")}
        />
      ) : null}

      {open === "complete" ? (
        <ConfirmDialog
          open
          onOpenChange={close}
          title="Mark this trip completed?"
          description="Records that the trip has been flown. It cannot be undone from the portal."
          confirmLabel="Mark completed"
          loading={pending}
          onConfirm={() => void move("COMPLETED", "Trip marked completed")}
        />
      ) : null}

      <Dialog open={open === "cancel"} onOpenChange={close}>
        <DialogContent
          title="Cancel this booking?"
          description="The booking is cancelled at once and your aircraft is released. The customer is told it was cancelled and is charged nothing: whatever they paid is refunded by Flyviman. Your reason is kept for you and Flyviman, not shown to the customer."
        >
          {/* Mounted only while open, so the form and its key start fresh. */}
          {open === "cancel" ? (
            <CancelForm
              base={base}
              onPending={setPending}
              onDone={async (conflict) => {
                setOpen(null);
                if (conflict) setProblem(conflict);
                else toast({ title: "Booking cancelled", tone: "success" });
                await refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CancelForm({
  base,
  onPending,
  onDone,
}: {
  base: string;
  onPending: (pending: boolean) => void;
  /** Called with a conflict's message, or null on success. */
  onDone: (conflict: string | null) => Promise<void>;
}) {
  // One key per opening of the dialog, reused if the call is retried.
  const [key] = useState(() => crypto.randomUUID());
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<CancelValues>({
    resolver: zodResolver(cancelSchema),
    defaultValues: { reason: "" },
  });

  async function submit(values: CancelValues) {
    setError(null);
    onPending(true);
    try {
      await apiFetch(`${base}/cancel`, {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: { reason: values.reason.trim() },
      });
      onPending(false);
      await onDone(null);
    } catch (failure) {
      onPending(false);
      if (failure instanceof ApiError && failure.status === 409) {
        await onDone(messageFor(failure));
        return;
      }
      setError(applyApiError(failure, setFieldError, ["reason"]));
    }
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => void handleSubmit(submit)(event)}
    >
      <FormAlert message={error} />
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
            Keep booking
          </Button>
        </DialogClose>
        <Button
          type="submit"
          variant="destructive"
          className="h-10"
          loading={isSubmitting}
        >
          Cancel booking
        </Button>
      </DialogFooter>
    </form>
  );
}
