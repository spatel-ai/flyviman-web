"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import {
  FEASIBILITY_ITEMS,
  type FeasibilityKey,
} from "@/lib/air-ambulance/labels";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import type { Schemas } from "@/lib/api/types";

type Checklist = Record<FeasibilityKey, boolean>;

function fromState(state: Schemas["FeasibilityStateDto"] | null): Checklist {
  return Object.fromEntries(
    FEASIBILITY_ITEMS.map(({ key }) => [key, state?.[key] ?? false]),
  ) as Checklist;
}

/**
 * The nine feasibility checks, saved as a whole. Confirming reads the saved
 * checklist (the server's `complete`), never these unsaved ticks.
 */
export function FeasibilityForm({
  path,
  state,
  editable,
  onSaved,
}: {
  path: string;
  state: Schemas["FeasibilityStateDto"] | null;
  editable: boolean;
  onSaved: (failure?: unknown) => void;
}) {
  const { toast } = useToast();
  const [checks, setChecks] = useState<Checklist>(() => fromState(state));
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      apiFetch(`${path}/feasibility`, {
        method: "PUT",
        body: checks satisfies Schemas["FeasibilityChecklistDto"],
      }),
    onSuccess: () => {
      setError(null);
      toast({ title: "Checklist saved", tone: "success" });
      onSaved();
    },
    onError: (failure) => {
      setError(messageFor(failure));
      onSaved(failure);
    },
  });

  const done = FEASIBILITY_ITEMS.filter(({ key }) => checks[key]).length;

  return (
    <form
      noValidate
      aria-label="Feasibility checklist"
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <FormAlert message={error} />
      <p className="text-body-sm text-muted">
        {done} of {FEASIBILITY_ITEMS.length} checked
        {state?.complete ? ", saved complete." : "."}
      </p>
      <div className="grid gap-1 sm:grid-cols-2">
        {FEASIBILITY_ITEMS.map(({ key, label }) => (
          <Checkbox
            key={key}
            label={label}
            checked={checks[key]}
            disabled={!editable || save.isPending}
            onCheckedChange={(checked) =>
              setChecks({ ...checks, [key]: checked === true })
            }
          />
        ))}
      </div>
      {editable ? (
        <div>
          <Button type="submit" variant="secondary" loading={save.isPending}>
            Save checklist
          </Button>
        </div>
      ) : null}
    </form>
  );
}
