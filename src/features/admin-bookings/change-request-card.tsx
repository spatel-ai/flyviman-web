"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { applyApiError, messageFor } from "@/lib/api/messages";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { decideSchema, type DecideValues } from "./schema";

type ChangeRequest = Schemas["ChangeRequestResponseDto"];
type Decision = "APPROVED" | "REJECTED";

const STATUS: Record<string, { label: string; tone: Tone }> = {
  REQUESTED: { label: "Waiting for an answer", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Declined", tone: "danger" },
  COMPLETED: { label: "Completed", tone: "neutral" },
};

const KIND: Record<string, string> = {
  CHANGE: "Change request",
  CANCELLATION: "Cancellation request",
};

/** One change or cancellation request; operations and super administrators can answer an open one. */
export function ChangeRequestCard({
  request,
  canDecide,
  linkToBooking = false,
}: {
  request: ChangeRequest;
  canDecide: boolean;
  /** In the list, where the booking is not already on screen. */
  linkToBooking?: boolean;
}) {
  const [deciding, setDeciding] = useState<Decision | null>(null);
  const status = Object.hasOwn(STATUS, request.status)
    ? STATUS[request.status]
    : { label: request.status, tone: "neutral" as const };

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">
          {Object.hasOwn(KIND, request.kind)
            ? KIND[request.kind]
            : request.kind}
        </p>
        <Badge tone={status.tone}>{status.label}</Badge>
        <span className="text-caption text-muted">
          {formatDateTime(request.createdAt)}
        </span>
        {linkToBooking ? (
          <Link
            href={`/admin/bookings/${request.bookingReference}`}
            className="text-body-sm text-accent hover:underline"
          >
            {request.bookingReference}
          </Link>
        ) : null}
      </div>
      {request.details ? (
        <p className="whitespace-pre-wrap break-words text-body-sm">
          {request.details}
        </p>
      ) : (
        <p className="text-body-sm text-muted">
          The customer&apos;s text is not shown to your role.
        </p>
      )}
      {request.decisionNote ? (
        <p className="text-body-sm text-muted">
          Note to the customer: {request.decisionNote}
        </p>
      ) : null}
      {canDecide && request.status === "REQUESTED" ? (
        <div className="flex flex-wrap gap-3">
          <Button className="h-10" onClick={() => setDeciding("APPROVED")}>
            Approve
          </Button>
          <Button
            variant="secondary"
            className="h-10"
            onClick={() => setDeciding("REJECTED")}
          >
            Decline
          </Button>
        </div>
      ) : null}
      <Dialog
        open={deciding !== null}
        onOpenChange={(open) => {
          if (!open) setDeciding(null);
        }}
      >
        <DialogContent
          title={
            deciding === "APPROVED"
              ? "Approve this request?"
              : "Decline this request?"
          }
          description="Your note is shown to the customer."
        >
          {deciding ? (
            <DecideForm
              request={request}
              decision={deciding}
              onClose={() => setDeciding(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function DecideForm({
  request,
  decision,
  onClose,
}: {
  request: ChangeRequest;
  decision: Decision;
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
  } = useForm<DecideValues>({
    resolver: zodResolver(decideSchema),
    defaultValues: { note: "" },
  });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.adminChangeRequestsAll,
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBookingsAll }),
    ]);

  const decide = useMutation({
    mutationFn: (values: DecideValues) =>
      apiFetch(`admin/change-requests/${request.id}/decide`, {
        method: "POST",
        body: { decision, note: values.note.trim() },
      }),
    onSuccess: async () => {
      toast({
        title:
          decision === "APPROVED" ? "Request approved" : "Request declined",
        tone: "success",
      });
      onClose();
      await refresh();
    },
    onError: async (failure) => {
      // Already answered, or the booking moved on: show the fresh state.
      if (failure instanceof ApiError && failure.status === 409) {
        toast({ title: messageFor(failure), tone: "danger" });
        onClose();
        await refresh();
        return;
      }
      setError(applyApiError(failure, setFieldError, ["note"]));
    },
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        setError(null);
        void handleSubmit((values) => decide.mutate(values))(event);
      }}
    >
      <FormAlert message={error} />
      <Textarea
        label="Note to the customer"
        rows={4}
        maxLength={1000}
        error={errors.note?.message}
        {...register("note")}
      />
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary" className="h-10">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" className="h-10" loading={decide.isPending}>
          {decision === "APPROVED" ? "Approve" : "Decline"}
        </Button>
      </DialogFooter>
    </form>
  );
}
