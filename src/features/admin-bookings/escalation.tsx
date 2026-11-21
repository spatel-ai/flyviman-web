"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { applyApiError } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { escalationSchema, type EscalationValues } from "./schema";

type Detail = Schemas["AdminBookingDetailDto"];

/**
 * The open escalation, shown to everyone who reads the booking (the reason
 * is in the audit trail too). Never personal or medical details.
 */
export function EscalationBanner({ booking }: { booking: Detail }) {
  if (!booking.escalation) return null;
  return (
    <div
      role="status"
      data-testid="escalated"
      className="rounded-lg bg-danger/12 p-4 text-body-sm"
    >
      <p className="font-medium">
        Escalated {formatDateTime(booking.escalation.escalatedAt)}
      </p>
      {booking.escalation.reason ? (
        <p className="mt-1">{booking.escalation.reason}</p>
      ) : null}
    </div>
  );
}

/**
 * Escalate the booking, or resolve its escalation, with a reason kept on the
 * timeline and in the audit trail. Operations and super administrators.
 */
export function EscalationControl({ booking }: { booking: Detail }) {
  const [open, setOpen] = useState(false);
  const escalated = booking.escalation !== null;
  return (
    <div>
      <Button
        variant="secondary"
        className="h-10"
        onClick={() => setOpen(true)}
      >
        {escalated ? "Resolve escalation" : "Escalate"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title={escalated ? "Resolve the escalation" : "Escalate this booking"}
          description={
            escalated
              ? "Say how it was resolved. The note is kept on the timeline and in the audit record."
              : "Flags the booking for operations' attention without changing its status. The reason is kept on the timeline and in the audit record."
          }
        >
          {/* Mounted only while open, so the form starts empty. */}
          <EscalationForm
            booking={booking}
            escalated={escalated}
            onClose={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EscalationForm({
  booking,
  escalated,
  onClose,
}: {
  booking: Detail;
  escalated: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<EscalationValues>({
    resolver: zodResolver(escalationSchema),
    defaultValues: { reason: "" },
  });

  const change = useMutation({
    mutationFn: (values: EscalationValues) =>
      apiFetch(
        `admin/bookings/${encodeURIComponent(booking.reference)}/${escalated ? "resolve-escalation" : "escalate"}`,
        { method: "POST", body: { reason: values.reason.trim() } },
      ),
    onSuccess: async () => {
      toast({
        title: escalated ? "Escalation resolved" : "Booking escalated",
        tone: "success",
      });
      onClose();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.adminBookingsAll,
      });
    },
    onError: async (failure) => {
      setError(applyApiError(failure, setFieldError, ["reason"]));
      // Someone else changed it meanwhile: show it as it is now.
      if (failure instanceof ApiError && failure.status === 409) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.adminBookingsAll,
        });
      }
    },
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        setError(null);
        void handleSubmit((values) => change.mutate(values))(event);
      }}
    >
      <FormAlert message={error} />
      <Textarea
        label={escalated ? "How it was resolved" : "Reason"}
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
        <Button type="submit" className="h-10" loading={change.isPending}>
          {escalated ? "Resolve" : "Escalate"}
        </Button>
      </DialogFooter>
    </form>
  );
}
