"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";
import { FormAlert } from "@/components/shared/form-alert";
import {
  operatorRegisterSchema,
  PASSWORD_MIN_LENGTH,
  type OperatorRegisterValues,
} from "./schema";
import { TermsCheckbox } from "./terms-checkbox";
import { useSubmit } from "./use-submit";
import { verifyPath, type VerificationSent } from "./verification";

export function OperatorRegisterForm() {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OperatorRegisterValues>({
    resolver: zodResolver(operatorRegisterSchema),
    defaultValues: { acceptTerms: false, phone: "" },
  });
  const { formError, submit } = useSubmit(setError, [
    "legalName",
    "contactName",
    "email",
    "phone",
    "password",
    "acceptTerms",
  ]);

  const onSubmit = submit(async (values: OperatorRegisterValues) => {
    const { phone, ...rest } = values;
    const { data } = await apiFetch<VerificationSent>("operator/register", {
      method: "POST",
      body: { ...rest, ...(phone ? { phone } : {}) },
    });
    router.push(verifyPath(data));
  });

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      <FormAlert message={formError} />
      <Input
        label="Company's registered name"
        autoComplete="organization"
        error={errors.legalName?.message}
        {...register("legalName")}
      />
      <Input
        label="Your name"
        autoComplete="name"
        error={errors.contactName?.message}
        {...register("contactName")}
      />
      <Input
        label="Work email"
        type="email"
        autoComplete="email"
        inputMode="email"
        hint="You will sign in with this."
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="Phone number (optional)"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        hint="With the country code, for example +919876543210."
        error={errors.phone?.message}
        {...register("phone")}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        error={errors.password?.message}
        {...register("password")}
      />
      <TermsCheckbox control={control} name="acceptTerms" />
      <Button type="submit" size="lg" loading={isSubmitting} className="mt-2">
        Register company
      </Button>
    </form>
  );
}
