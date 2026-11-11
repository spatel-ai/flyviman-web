"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";
import { FormAlert } from "@/components/shared/form-alert";
import { forgotSchema, type ForgotValues } from "./schema";
import { useSubmit } from "./use-submit";

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema) });
  const { formError, submit } = useSubmit(setError, ["email"]);

  const onSubmit = submit(async (values: ForgotValues) => {
    await apiFetch("auth/password/forgot", { method: "POST", body: values });
    setSentTo(values.email);
  });

  if (sentTo) {
    // The same message whether or not the account exists.
    return (
      <p role="status" className="text-muted">
        If there is a Flyviman account for{" "}
        <span className="font-medium text-foreground">{sentTo}</span>, we have
        emailed a link to choose a new password. It works once and expires in 30
        minutes.
      </p>
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
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Button type="submit" size="lg" loading={isSubmitting} className="mt-2">
        Email me a link
      </Button>
    </form>
  );
}
