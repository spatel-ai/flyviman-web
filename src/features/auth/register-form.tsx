"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api/client";
import { FormAlert } from "@/components/shared/form-alert";
import {
  PASSWORD_MIN_LENGTH,
  registerEmailSchema,
  registerPhoneSchema,
  type RegisterEmailValues,
  type RegisterPhoneValues,
} from "./schema";
import { TermsCheckbox } from "./terms-checkbox";
import { useSubmit } from "./use-submit";
import { verifyPath, type VerificationSent } from "./verification";

function Names({
  register,
  errors,
}: {
  register: ReturnType<typeof useForm<RegisterEmailValues>>["register"];
  errors: { firstName?: { message?: string }; lastName?: { message?: string } };
}) {
  return (
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
  );
}

function WithEmail() {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterEmailValues>({
    resolver: zodResolver(registerEmailSchema),
    defaultValues: { acceptTerms: false },
  });
  const { formError, submit } = useSubmit(setError, [
    "firstName",
    "lastName",
    "email",
    "password",
    "acceptTerms",
  ]);

  const onSubmit = submit(async (values: RegisterEmailValues) => {
    const { data } = await apiFetch<VerificationSent>("auth/register", {
      method: "POST",
      body: values,
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
      <Names register={register} errors={errors} />
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...register("email")}
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
        Create account
      </Button>
    </form>
  );
}

function WithMobile() {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterPhoneValues>({
    resolver: zodResolver(registerPhoneSchema),
    defaultValues: { acceptTerms: false },
  });
  const { formError, submit } = useSubmit(setError, [
    "firstName",
    "lastName",
    "phone",
    "acceptTerms",
  ]);

  const onSubmit = submit(async (values: RegisterPhoneValues) => {
    const { data } = await apiFetch<VerificationSent>("auth/register", {
      method: "POST",
      body: values,
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
      <Input
        label="Mobile number"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        hint="With the country code, for example +919876543210. We will text you a code."
        error={errors.phone?.message}
        {...register("phone")}
      />
      <TermsCheckbox control={control} name="acceptTerms" />
      <Button type="submit" size="lg" loading={isSubmitting} className="mt-2">
        Create account
      </Button>
    </form>
  );
}

export function RegisterForm() {
  return (
    <Tabs defaultValue="email">
      <TabsList aria-label="How to register">
        <TabsTrigger value="email">Email</TabsTrigger>
        <TabsTrigger value="mobile">Mobile number</TabsTrigger>
      </TabsList>
      <TabsContent value="email" animate>
        <WithEmail />
      </TabsContent>
      <TabsContent value="mobile" animate>
        <WithMobile />
      </TabsContent>
    </Tabs>
  );
}
