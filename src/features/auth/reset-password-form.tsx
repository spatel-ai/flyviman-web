"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button-classes";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";
import { FormAlert } from "@/components/shared/form-alert";
import { PASSWORD_MIN_LENGTH, resetSchema, type ResetValues } from "./schema";
import { useSubmit } from "./use-submit";

export function ResetPasswordForm() {
  const token = useSearchParams().get("token");
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({ resolver: zodResolver(resetSchema) });
  const { formError, submit } = useSubmit(setError, ["password"]);

  const onSubmit = submit(async (values: ResetValues) => {
    await apiFetch("auth/password/reset", {
      method: "POST",
      body: { token, password: values.password },
    });
    setDone(true);
  });

  if (!token) {
    return (
      <p className="text-muted">
        This link is incomplete.{" "}
        <Link href="/forgot-password" className="text-accent hover:underline">
          Request a new one
        </Link>
        .
      </p>
    );
  }

  if (done) {
    return (
      <div role="status" className="flex flex-col gap-4">
        <p className="text-muted">
          Your password has been set. You have been signed out everywhere else.
        </p>
        <Link href="/login" className={buttonClasses({ size: "lg" })}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      <FormAlert message={formError} />
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        error={errors.password?.message}
        {...register("password")}
      />
      <Input
        label="Repeat the new password"
        type="password"
        autoComplete="new-password"
        error={errors.confirm?.message}
        {...register("confirm")}
      />
      <Button type="submit" size="lg" loading={isSubmitting} className="mt-2">
        Set password
      </Button>
    </form>
  );
}
