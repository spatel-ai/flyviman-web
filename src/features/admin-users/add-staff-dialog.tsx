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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { applyApiError } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import {
  STAFF_ROLE_OPTIONS,
  staffSchema,
  type StaffInput,
  type StaffValues,
} from "./staff-schema";

export function AddStaffDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-10">Add staff account</Button>
      </DialogTrigger>
      <DialogContent
        title="Add staff account"
        description="They receive an email link to choose a password. The account is active once they do."
      >
        {/* Mounted only while open, so the form starts empty each time. */}
        <StaffForm onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function StaffForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<StaffInput, unknown, StaffValues>({
    resolver: zodResolver(staffSchema),
  });

  async function onSubmit(values: StaffValues) {
    setFormError(null);
    try {
      const { data } = await apiFetch<Schemas["AdminUserResponseDto"]>(
        "admin/staff",
        { method: "POST", body: values },
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.adminUsers({}).slice(0, 2),
      });
      toast({
        title: `Invitation sent to ${data.email ?? values.email}`,
        tone: "success",
      });
      onDone();
    } catch (error) {
      if (error instanceof ApiError && error.code === "USER_ALREADY_EXISTS") {
        setError("email", {
          type: "server",
          message: "An account with this email already exists.",
        });
        return;
      }
      setFormError(applyApiError(error, setError, ["email", "role"]));
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
      <Input
        label="Email"
        type="email"
        autoComplete="off"
        inputMode="email"
        className="h-10"
        error={errors.email?.message}
        {...register("email")}
      />
      <Controller
        control={control}
        name="role"
        render={({ field }) => (
          <Select
            label="Role"
            placeholder="Choose a role"
            options={STAFF_ROLE_OPTIONS}
            name={field.name}
            // Empty rather than undefined, so the select stays controlled.
            value={field.value ?? ""}
            onValueChange={field.onChange}
            className="h-10"
            error={errors.role?.message}
          />
        )}
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
