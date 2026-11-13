"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
} from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { applyApiError } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { CAPABILITY_LABELS, type Capability } from "@/lib/operator-access";
import {
  CAPABILITIES,
  CAPABILITY_HINTS,
  inviteSchema,
  permissionsBody,
  permissionsSchema,
  type InviteValues,
  type PermissionsValues,
} from "./staff-schema";

type StaffMember = Schemas["StaffMemberDto"];
type Summary = Schemas["AircraftSummaryResponseDto"];

const EMPTY: PermissionsValues = {
  capabilities: [],
  allAircraft: false,
  aircraftIds: [],
};

/** Invites someone to the team. Mounted only while its dialog is open. */
export function InviteForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", ...EMPTY },
  });

  async function onSubmit(values: InviteValues) {
    setFormError(null);
    try {
      await apiFetch<StaffMember>("operator/staff", {
        method: "POST",
        body: { email: values.email, ...permissionsBody(values) },
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.operatorStaff });
      toast({ title: `Invitation sent to ${values.email}`, tone: "success" });
      onDone();
    } catch (error) {
      if (error instanceof ApiError && error.code === "USER_ALREADY_EXISTS") {
        setError("email", {
          type: "server",
          message:
            "This email already belongs to an account and cannot be invited.",
        });
        return;
      }
      setFormError(
        applyApiError(error, setError, [
          "email",
          "capabilities",
          "aircraftIds",
        ]),
      );
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      <FormAlert message={formError} />
      <Input
        label="Email"
        type="email"
        autoComplete="off"
        inputMode="email"
        className="h-10"
        error={errors.email?.message}
        {...register("email")}
      />
      <PermissionFields
        control={control as unknown as Control<PermissionsValues>}
        errors={errors}
      />
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary" className="h-10">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" className="h-10" loading={isSubmitting}>
          Send invitation
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Changes a staff member's permissions. */
export function EditAccessForm({
  member,
  onDone,
}: {
  member: StaffMember;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PermissionsValues>({
    resolver: zodResolver(permissionsSchema),
    defaultValues: {
      capabilities: member.capabilities,
      allAircraft: member.allAircraft,
      aircraftIds: member.aircraftIds,
    },
  });

  async function onSubmit(values: PermissionsValues) {
    setFormError(null);
    try {
      await apiFetch<StaffMember>(`operator/staff/${member.id}`, {
        method: "PATCH",
        body: permissionsBody(values),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.operatorStaff });
      toast({ title: "Access updated", tone: "success" });
      onDone();
    } catch (error) {
      setFormError(
        applyApiError(error, setError, ["capabilities", "aircraftIds"]),
      );
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      <FormAlert message={formError} />
      <PermissionFields control={control} errors={errors} />
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary" className="h-10">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" className="h-10" loading={isSubmitting}>
          Save access
        </Button>
      </DialogFooter>
    </form>
  );
}

function toggle<T>(list: T[], item: T, on: boolean): T[] {
  return on ? [...new Set([...list, item])] : list.filter((x) => x !== item);
}

/** Permissions and aircraft, shared by the invite and edit forms. */
function PermissionFields({
  control,
  errors,
}: {
  control: Control<PermissionsValues>;
  errors: FieldErrors<PermissionsValues>;
}) {
  const fleet = useQuery({
    queryKey: queryKeys.operatorAircraftAll,
    queryFn: () =>
      apiFetch<Summary[]>("operator/aircraft", { query: { pageSize: 100 } }),
  });
  const allAircraft = useWatch({ control, name: "allAircraft" });

  return (
    <>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-body-sm font-medium">Permissions</legend>
        <Controller
          control={control}
          name="capabilities"
          render={({ field }) => (
            <>
              {CAPABILITIES.map((capability: Capability) => (
                <Checkbox
                  key={capability}
                  name={field.name}
                  label={CAPABILITY_LABELS[capability]}
                  hint={CAPABILITY_HINTS[capability]}
                  checked={field.value.includes(capability)}
                  onCheckedChange={(checked) =>
                    field.onChange(
                      toggle(field.value, capability, checked === true),
                    )
                  }
                />
              ))}
            </>
          )}
        />
        {errors.capabilities?.message ? (
          <p role="alert" className="text-caption text-danger">
            {errors.capabilities.message}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-body-sm font-medium">Aircraft</legend>
        <Controller
          control={control}
          name="allAircraft"
          render={({ field }) => (
            <Checkbox
              name={field.name}
              label="All aircraft, including ones added later"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
          )}
        />
        <Controller
          control={control}
          name="aircraftIds"
          render={({ field }) => (
            <AircraftChoices
              fleet={fleet.data?.data}
              loading={fleet.isPending}
              disabled={allAircraft}
              selected={field.value}
              onChange={field.onChange}
            />
          )}
        />
        {errors.aircraftIds?.message ? (
          <p role="alert" className="text-caption text-danger">
            {errors.aircraftIds.message}
          </p>
        ) : null}
      </fieldset>
    </>
  );
}

function AircraftChoices({
  fleet,
  loading,
  disabled,
  selected,
  onChange,
}: {
  fleet: Summary[] | undefined;
  loading: boolean;
  disabled: boolean;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  if (loading) return <Skeleton className="h-11 w-full" />;
  if (!fleet || fleet.length === 0) {
    return (
      <p className="text-body-sm text-muted">
        No aircraft yet. Choose all aircraft, or add an aircraft first.
      </p>
    );
  }
  return (
    <div className="ml-8 flex flex-col">
      {fleet.map((aircraft) => (
        <Checkbox
          key={aircraft.id}
          label={`${aircraft.registration} · ${aircraft.manufacturer} ${aircraft.model}`}
          disabled={disabled}
          checked={disabled || selected.includes(aircraft.id)}
          onCheckedChange={(checked) =>
            onChange(toggle(selected, aircraft.id, checked === true))
          }
        />
      ))}
    </div>
  );
}
