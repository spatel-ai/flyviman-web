"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { applyApiError, messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Role, Schemas } from "@/lib/api/types";
import { ROLE_LABELS } from "@/lib/auth/roles";
import {
  changeRoleSchema,
  REASON_MAX,
  STAFF_ROLE_OPTIONS,
  type ChangeRoleInput,
  type ChangeRoleValues,
} from "./staff-schema";

type AdminUser = Schemas["AdminUserResponseDto"];

/** Changes an internal account's role, with a reason. */
export function ChangeRoleDialog({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) {
  const who = user.email ?? user.phone ?? "This user";
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent
        title="Change role"
        description={`${who} is signed out everywhere and signs in again with the new role. The change and its reason are kept in the audit log.`}
      >
        <ChangeRoleForm user={user} onDone={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function ChangeRoleForm({
  user,
  onDone,
}: {
  user: AdminUser;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const options = STAFF_ROLE_OPTIONS.filter(
    (option) => option.value !== user.role,
  );
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangeRoleInput, unknown, ChangeRoleValues>({
    resolver: zodResolver(changeRoleSchema),
    defaultValues: { reason: "" },
  });

  async function onSubmit(values: ChangeRoleValues) {
    setFormError(null);
    try {
      await apiFetch<AdminUser>(`admin/users/${user.id}/role`, {
        method: "PATCH",
        body: values,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.adminUsers({}).slice(0, 2),
      });
      toast({
        title: `Role changed to ${ROLE_LABELS[values.role]}`,
        tone: "success",
      });
      onDone();
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.code === "USER_INVALID_TRANSITION" || error.code === "NOT_FOUND")
      ) {
        // The account changed under us: show the latest list.
        void queryClient.invalidateQueries({
          queryKey: queryKeys.adminUsers({}).slice(0, 2),
        });
        setFormError(
          error.code === "NOT_FOUND"
            ? "This user no longer exists."
            : "This account's role has already changed. The list now shows the latest.",
        );
        return;
      }
      setFormError(
        error instanceof ApiError && error.code === "VALIDATION_ERROR"
          ? applyApiError(error, setError, ["role", "reason"])
          : messageFor(error),
      );
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      {formError ? (
        <p
          role="alert"
          className="rounded-sm bg-danger/12 px-3.5 py-2.5 text-body-sm text-danger"
        >
          {formError}
        </p>
      ) : null}
      <p className="text-body-sm text-muted">
        Current role:{" "}
        <span className="text-foreground">
          {Object.hasOwn(ROLE_LABELS, user.role)
            ? ROLE_LABELS[user.role as Role]
            : user.role}
        </span>
      </p>
      <Controller
        control={control}
        name="role"
        render={({ field }) => (
          <Select
            label="New role"
            placeholder="Choose a role"
            options={options}
            name={field.name}
            value={field.value ?? ""}
            onValueChange={field.onChange}
            className="h-10"
            error={errors.role?.message}
          />
        )}
      />
      <Textarea
        label="Reason"
        hint="Kept in the audit log."
        rows={3}
        maxLength={REASON_MAX}
        error={errors.reason?.message}
        {...register("reason")}
      />
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary" className="h-10">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" className="h-10" loading={isSubmitting}>
          Change role
        </Button>
      </DialogFooter>
    </form>
  );
}
