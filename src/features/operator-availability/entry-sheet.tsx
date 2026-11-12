"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDateTime } from "@/lib/format/date";
import { formatTimeRange } from "@/lib/format/zoned";
import type { Entry } from "./entries";
import { ENTRY_LABELS, ENTRY_TONES } from "./labels";

export interface EntrySheetProps {
  entry: Entry | null;
  registration: string;
  zone: string;
  approved: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (slot: Entry) => void;
}

/** One entry's details, with change and remove where allowed. */
export function EntrySheet({
  entry,
  registration,
  zone,
  approved,
  onOpenChange,
  onEdit,
}: EntrySheetProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!entry) return;
    setRemoving(true);
    setError(null);
    try {
      const collection = entry.source === "slot" ? "slots" : "blocks";
      await apiFetch(
        `operator/aircraft/${encodeURIComponent(entry.aircraftId)}/availability/${collection}/${encodeURIComponent(entry.id)}`,
        { method: "DELETE" },
      );
      toast({ title: `${ENTRY_LABELS[entry.type]} removed`, tone: "success" });
      setConfirming(false);
      onOpenChange(false);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.availability,
      });
    } catch (failure) {
      setConfirming(false);
      setError(messageFor(failure));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Sheet open={entry !== null} onOpenChange={onOpenChange}>
      {entry ? (
        <SheetContent
          title={`${ENTRY_LABELS[entry.type]} · ${registration}`}
          description={formatTimeRange(entry.startsAt, entry.endsAt, zone)}
        >
          <div className="flex flex-col gap-4">
            {error ? (
              <p role="alert" className="text-body-sm text-danger">
                {error}
              </p>
            ) : null}
            <Badge tone={ENTRY_TONES[entry.type]} className="self-start">
              {ENTRY_LABELS[entry.type]}
            </Badge>
            <dl className="grid gap-3 text-body-sm">
              <div>
                <dt className="text-muted">When</dt>
                <dd>{formatTimeRange(entry.startsAt, entry.endsAt, zone)}</dd>
              </div>
              {entry.expiresAt ? (
                <div>
                  <dt className="text-muted">Hold lapses</dt>
                  <dd>{formatDateTime(entry.expiresAt, zone)}</dd>
                </div>
              ) : null}
              {entry.note ? (
                <div>
                  <dt className="text-muted">Note</dt>
                  <dd>{entry.note}</dd>
                </div>
              ) : null}
            </dl>
            {entry.type === "BOOKING" ? (
              <p className="text-body-sm text-muted">
                Created by a booking. It changes only when the booking changes.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {entry.source === "slot" && approved ? (
                  <Button variant="secondary" onClick={() => onEdit(entry)}>
                    Change
                  </Button>
                ) : null}
                <Button
                  variant="destructive"
                  onClick={() => setConfirming(true)}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      ) : null}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={
          entry
            ? `Remove this ${ENTRY_LABELS[entry.type].toLowerCase()}?`
            : "Remove"
        }
        description={
          entry?.source === "slot"
            ? "Customers will no longer be offered this time."
            : "The aircraft will show as free in this time again."
        }
        confirmLabel="Remove"
        destructive
        loading={removing}
        onConfirm={() => void remove()}
      />
    </Sheet>
  );
}
