"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";

const OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "UNAVAILABLE", label: "Unavailable" },
  { value: "MAINTENANCE", label: "Maintenance" },
];

const EFFECT: Record<string, string> = {
  AVAILABLE:
    "Customers can be offered this aircraft again, where it is approved.",
  UNAVAILABLE:
    "Customers will not be offered this aircraft until you change it back.",
  MAINTENANCE:
    "The aircraft is grounded for maintenance and not offered to customers.",
};

/**
 * Whether the aircraft is offered at all. Open to a suspended operator and
 * on a listing under review, so an aircraft can always be grounded (D-058).
 */
export function AvailabilityStatusControl({
  base,
  status,
  onChanged,
}: {
  base: string;
  status: string;
  onChanged: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [next, setNext] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!next) return;
    setPending(true);
    setError(null);
    try {
      await apiFetch(`${base}/availability-status`, {
        method: "PATCH",
        body: { status: next },
      });
      toast({
        title: `Marked ${OPTIONS.find((o) => o.value === next)?.label.toLowerCase()}`,
        tone: "success",
      });
      setNext(null);
      await onChanged();
    } catch (failure) {
      setNext(null);
      setError(messageFor(failure));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex max-w-xs flex-col gap-2">
      <Select
        label="Availability"
        options={OPTIONS}
        value={status}
        onValueChange={(value) => value !== status && setNext(value)}
        error={error ?? undefined}
      />
      <ConfirmDialog
        open={next !== null}
        onOpenChange={(open) => !open && setNext(null)}
        title={`Mark as ${OPTIONS.find((o) => o.value === next)?.label.toLowerCase() ?? ""}?`}
        description={next ? EFFECT[next] : ""}
        confirmLabel="Change"
        loading={pending}
        onConfirm={() => void confirm()}
      />
    </div>
  );
}
