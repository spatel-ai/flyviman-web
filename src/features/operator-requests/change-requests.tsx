"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/client";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { TextDialog } from "./text-dialog";
import type { Act } from "./use-act";

type ChangeRequest = Schemas["ChangeRequestResponseDto"];

const STATUS: Record<
  string,
  { label: string; tone: "warning" | "success" | "danger" | "neutral" }
> = {
  REQUESTED: { label: "Waiting for your answer", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Declined", tone: "danger" },
  COMPLETED: { label: "Completed", tone: "neutral" },
};

const KIND: Record<string, string> = {
  CHANGE: "Change request",
  CANCELLATION: "Cancellation",
};

/** The customer's change and cancellation requests; an open one can be answered. */
export function ChangeRequests({
  requests,
  act,
  onConflict,
}: {
  requests: ChangeRequest[];
  act: Act;
  onConflict: (error: unknown) => boolean;
}) {
  const [deciding, setDeciding] = useState<{
    request: ChangeRequest;
    decision: "APPROVED" | "REJECTED";
  } | null>(null);
  if (requests.length === 0) return null;

  return (
    <section aria-labelledby="changes-heading" className="flex flex-col gap-3">
      <h2 id="changes-heading" className="text-title">
        Change requests
      </h2>
      {requests.map((request) => {
        const status = Object.hasOwn(STATUS, request.status)
          ? STATUS[request.status]
          : { label: request.status, tone: "neutral" as const };
        return (
          <Card key={request.id} className="flex flex-col gap-3">
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
            </div>
            <p className="whitespace-pre-wrap text-body-sm">
              {request.details}
            </p>
            {request.decisionNote ? (
              <p className="text-body-sm text-muted">
                Your note to the customer: {request.decisionNote}
              </p>
            ) : null}
            {request.status === "REQUESTED" ? (
              <div className="flex flex-wrap gap-3">
                <Button
                  className="h-11"
                  onClick={() => setDeciding({ request, decision: "APPROVED" })}
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  className="h-11"
                  onClick={() => setDeciding({ request, decision: "REJECTED" })}
                >
                  Decline
                </Button>
              </div>
            ) : null}
          </Card>
        );
      })}
      <TextDialog
        open={deciding !== null}
        onOpenChange={(open) => {
          if (!open) setDeciding(null);
        }}
        title={
          deciding?.decision === "APPROVED"
            ? "Approve this change?"
            : "Decline this change?"
        }
        description="Your note is shown to the customer."
        label="Note to the customer"
        submitLabel={deciding?.decision === "APPROVED" ? "Approve" : "Decline"}
        maxLength={1000}
        onSubmit={async (note) => {
          if (!deciding) return;
          try {
            await act(
              deciding.decision === "APPROVED"
                ? "Change request approved"
                : "Change request declined",
              () =>
                apiFetch(
                  `operator/change-requests/${deciding.request.id}/decide`,
                  {
                    method: "POST",
                    body: { decision: deciding.decision, note },
                  },
                ),
            );
          } catch (error) {
            if (!onConflict(error)) throw error;
          }
        }}
      />
    </section>
  );
}
