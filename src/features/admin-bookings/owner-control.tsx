"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";

type AdminUser = Schemas["AdminUserResponseDto"];

const NONE = "none";

/** Operations users and super administrators, active ones only (the API refuses anyone else). */
async function staffOwners(): Promise<AdminUser[]> {
  const lists = await Promise.all(
    (["OPS", "SUPER_ADMIN"] as const).map((role) =>
      apiFetch<AdminUser[]>("admin/users", {
        query: { role, status: "ACTIVE", pageSize: 100 },
      }),
    ),
  );
  return lists.flatMap((list) => list.data);
}

/** Who owns the booking in operations: assign to me, or to another colleague. */
export function OwnerControl({
  reference,
  assignedToId,
  viewerId,
}: {
  reference: string;
  assignedToId: string | null;
  viewerId: string | undefined;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const owners = useQuery({
    queryKey: queryKeys.adminStaffOwners,
    queryFn: staffOwners,
  });

  const assign = useMutation({
    mutationFn: (assigneeId: string | null) =>
      apiFetch(`admin/bookings/${reference}/assign`, {
        method: "POST",
        body: { assigneeId },
      }),
    onSuccess: async (_result, assigneeId) => {
      setError(null);
      toast({
        title: assigneeId ? "Owner set" : "Owner removed",
        tone: "success",
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.adminBookingsAll,
      });
    },
    onError: (failure) => setError(messageFor(failure)),
  });

  const options = [
    { value: NONE, label: "Nobody" },
    ...(owners.data ?? []).map((user) => ({
      value: user.id,
      label: user.id === viewerId ? "Me" : (user.email ?? user.id),
    })),
  ];
  // The current owner may be missing from the list (suspended since).
  const value = assignedToId ?? NONE;
  if (!options.some((option) => option.value === value)) {
    options.push({ value, label: "Another colleague" });
  }

  return (
    <div className="flex flex-col gap-3">
      <FormAlert message={error} />
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Operations owner"
          options={options}
          value={value}
          disabled={owners.isPending || assign.isPending}
          onValueChange={(next) => assign.mutate(next === NONE ? null : next)}
          className="h-10 w-72 max-w-full"
        />
        {viewerId && assignedToId !== viewerId ? (
          <Button
            variant="secondary"
            className="h-10"
            loading={assign.isPending}
            onClick={() => assign.mutate(viewerId)}
          >
            Assign to me
          </Button>
        ) : null}
      </div>
      {owners.isError ? (
        <p className="text-body-sm text-muted">
          The list of colleagues could not be loaded. Assign to me still works.
        </p>
      ) : null}
    </div>
  );
}
