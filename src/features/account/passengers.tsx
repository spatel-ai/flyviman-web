"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { FormAlert } from "@/components/shared/form-alert";
import { LoadError } from "@/components/shared/load-error";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { COUNTRIES } from "@/lib/countries";
import { PassengerDialog } from "./passenger-dialog";
import { DOCUMENT_TYPES, maskDocumentNumber } from "./schema";

type Passenger = Schemas["PassengerResponseDto"];

function summary(passenger: Passenger): string[] {
  const lines: string[] = [];
  const country = COUNTRIES.find((c) => c.value === passenger.nationality);
  if (country) lines.push(country.label);
  if (passenger.documentType && passenger.documentNumber) {
    const type = DOCUMENT_TYPES.find((d) => d.value === passenger.documentType);
    lines.push(
      `${type?.label ?? "Document"} ${maskDocumentNumber(passenger.documentNumber)}`,
    );
  }
  if (passenger.specialAssistance) lines.push(passenger.specialAssistance);
  return lines;
}

export function Passengers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Passenger | "new" | null>(null);
  const [removing, setRemoving] = useState<Passenger | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const passengers = useQuery({
    queryKey: queryKeys.passengers,
    queryFn: async () => (await apiFetch<Passenger[]>("me/passengers")).data,
  });

  const remove = useMutation({
    mutationFn: (passenger: Passenger) =>
      apiFetch(`me/passengers/${passenger.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setRemoving(null);
      toast({ title: "Passenger removed", tone: "success" });
      await queryClient.invalidateQueries({ queryKey: queryKeys.passengers });
    },
    onError: (error) => {
      setRemoving(null);
      setRemoveError(messageFor(error));
    },
  });

  if (passengers.isPending) {
    return (
      <div
        role="status"
        aria-label="Loading your saved passengers"
        className="grid gap-4 md:grid-cols-2"
      >
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }
  if (passengers.isError) {
    return (
      <LoadError
        what="your saved passengers"
        error={passengers.error}
        onRetry={() => void passengers.refetch()}
      />
    );
  }

  const addButton = (
    <Button onClick={() => setEditing("new")}>Add a passenger</Button>
  );

  return (
    <>
      <FormAlert message={removeError} />
      {passengers.data.length === 0 ? (
        <EmptyState
          title="No saved passengers yet"
          description="Save the people you travel with so booking is quicker."
          action={addButton}
        />
      ) : (
        <>
          <div className="mb-6">{addButton}</div>
          <ul
            aria-label="Saved passengers"
            className="grid gap-4 md:grid-cols-2"
          >
            {passengers.data.map((passenger) => {
              const fullName = `${passenger.firstName} ${passenger.lastName}`;
              return (
                <li key={passenger.id}>
                  <Card variant="raised" className="flex h-full flex-col gap-3">
                    <div className="flex-1">
                      <h2 className="text-title">{fullName}</h2>
                      {summary(passenger).map((line) => (
                        <p key={line} className="text-body-sm text-muted">
                          {line}
                        </p>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Edit ${fullName}`}
                        onClick={() => setEditing(passenger)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${fullName}`}
                        onClick={() => {
                          setRemoveError(null);
                          setRemoving(passenger);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <PassengerDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        passenger={editing === "new" ? null : editing}
        onSaved={() => {
          const added = editing === "new";
          setEditing(null);
          toast({
            title: added ? "Passenger saved" : "Changes saved",
            tone: "success",
          });
          void queryClient.invalidateQueries({
            queryKey: queryKeys.passengers,
          });
        }}
      />
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title="Remove this passenger?"
        description={
          removing
            ? `${removing.firstName} ${removing.lastName} will be removed from your saved passengers.`
            : ""
        }
        confirmLabel="Remove passenger"
        destructive
        loading={remove.isPending}
        onConfirm={() => {
          if (removing) remove.mutate(removing);
        }}
      />
    </>
  );
}
