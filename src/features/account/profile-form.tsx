"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { LoadError } from "@/components/shared/load-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { applyApiError } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Me, Schemas } from "@/lib/api/types";
import { COUNTRIES } from "@/lib/countries";
import {
  NONE,
  profileSchema,
  toProfileBody,
  type ProfileValues,
} from "./schema";

const NATIONALITIES = [{ value: NONE, label: "Not specified" }, ...COUNTRIES];

function Form({ me }: { me: Me }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: me.profile?.firstName ?? "",
      lastName: me.profile?.lastName ?? "",
      dateOfBirth: me.profile?.dateOfBirth ?? "",
      nationality: me.profile?.nationality ?? NONE,
    },
  });

  async function onSubmit(values: ProfileValues) {
    setFormError(null);
    try {
      const { data } = await apiFetch<Schemas["ProfileResponseDto"]>("me", {
        method: "PATCH",
        body: toProfileBody(values),
      });
      queryClient.setQueryData<Me>(queryKeys.me, { ...me, profile: data });
      reset(values);
      toast({ title: "Profile saved", tone: "success" });
      // The header shows the first name.
      router.refresh();
    } catch (error) {
      setFormError(
        applyApiError(error, setError, [
          "firstName",
          "lastName",
          "dateOfBirth",
          "nationality",
        ]),
      );
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex max-w-reading flex-col gap-4"
    >
      <FormAlert message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="First name"
          autoComplete="given-name"
          error={errors.firstName?.message}
          {...register("firstName")}
        />
        <Input
          label="Last name"
          autoComplete="family-name"
          error={errors.lastName?.message}
          {...register("lastName")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Date of birth"
          type="date"
          autoComplete="bday"
          error={errors.dateOfBirth?.message}
          {...register("dateOfBirth")}
        />
        <Controller
          control={control}
          name="nationality"
          render={({ field }) => (
            <Select
              label="Nationality"
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
              options={NATIONALITIES}
              error={errors.nationality?.message}
            />
          )}
        />
      </div>
      <dl className="grid gap-4 border-t border-border/60 pt-4 sm:grid-cols-2">
        <div>
          <dt className="text-body-sm text-muted">Email</dt>
          <dd>{me.email ?? "Not added"}</dd>
        </div>
        <div>
          <dt className="text-body-sm text-muted">Mobile number</dt>
          <dd>{me.phone ?? "Not added"}</dd>
        </div>
      </dl>
      <div>
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          Save profile
        </Button>
      </div>
    </form>
  );
}

export function ProfileForm() {
  const me = useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => (await apiFetch<Me>("me")).data,
  });

  if (me.isPending) {
    return (
      <div
        role="status"
        aria-label="Loading your profile"
        className="max-w-reading"
      >
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (me.isError) {
    return (
      <LoadError
        what="your profile"
        error={me.error}
        onRetry={() => void me.refetch()}
      />
    );
  }
  return <Form me={me.data} />;
}
