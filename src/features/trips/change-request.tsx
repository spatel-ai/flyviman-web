"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FormAlert } from "@/components/shared/form-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { isInProgress } from "./status";

type Booking = Schemas["BookingResponseDto"];

const KIND: Record<string, string> = {
  CHANGE: "Change",
  CANCELLATION: "Cancellation",
};
const STATE: Record<string, string> = {
  REQUESTED: "Waiting for an answer",
  APPROVED: "Approved",
  REJECTED: "Declined",
  COMPLETED: "Done",
};

/** Past change requests with their answers, and the form for a new one while the trip is in progress. */
export function ChangeRequests({ booking }: { booking: Booking }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);

  const open = booking.changeRequests.some((r) => r.status === "REQUESTED");
  const canRequest = isInProgress(booking.status) && !open;

  const request = useMutation({
    mutationFn: (text: string) =>
      apiFetch(
        `bookings/${encodeURIComponent(booking.reference)}/change-requests`,
        {
          method: "POST",
          body: { details: text },
        },
      ),
    onSuccess: async () => {
      setDetails("");
      toast({ title: "Change request sent", tone: "success" });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.booking(booking.reference),
      });
    },
    onError: async (failure) => {
      setError(messageFor(failure));
      if (failure instanceof ApiError && failure.status === 409) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.booking(booking.reference),
        });
      }
    },
  });

  if (!canRequest && booking.changeRequests.length === 0) return null;

  return (
    <section aria-labelledby="changes-heading" className="flex flex-col gap-4">
      <h2 id="changes-heading" className="text-title">
        Changes
      </h2>
      {booking.changeRequests.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {booking.changeRequests.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-1 rounded-lg bg-surface p-4"
            >
              <p className="flex flex-wrap items-center gap-2 text-caption text-muted">
                {KIND[item.kind] ?? item.kind} request ·{" "}
                {formatDateTime(item.createdAt)}
                <Badge>{STATE[item.status] ?? item.status}</Badge>
              </p>
              <p className="text-body-sm whitespace-pre-wrap">{item.details}</p>
              {item.decisionNote ? (
                <p className="text-body-sm text-muted">
                  Answer: {item.decisionNote}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {canRequest ? (
        <form
          noValidate
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!details.trim()) {
              setError("Say what you would like changed.");
              return;
            }
            setError(null);
            request.mutate(details.trim());
          }}
        >
          <FormAlert message={error} />
          <Textarea
            label="Ask for a change"
            hint="For example another date or time. A change of price comes as a new quote."
            rows={3}
            maxLength={1000}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
          />
          <Button
            type="submit"
            variant="secondary"
            loading={request.isPending}
            className="self-start"
          >
            Send change request
          </Button>
        </form>
      ) : null}
    </section>
  );
}
