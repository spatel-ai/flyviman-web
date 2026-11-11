"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api/client";
import type { User } from "@/lib/api/types";
import { destinationAfterLogin } from "@/lib/auth/roles";
import { FormAlert } from "@/components/shared/form-alert";
import {
  loginSchema,
  phoneSchema,
  type LoginValues,
  type PhoneValues,
} from "./schema";
import { useSubmit } from "./use-submit";
import { verifyPath, type VerificationSent } from "./verification";

function EmailSignIn({ next }: { next: string | null }) {
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const { formError, submit } = useSubmit(setError, ["email", "password"]);

  const onSubmit = submit(async (values: LoginValues) => {
    const { data } = await apiFetch<User>("auth/login", {
      method: "POST",
      body: values,
    });
    setDone(true);
    // A full navigation, so every server-rendered part sees the session.
    window.location.assign(destinationAfterLogin(data.role, next));
  });

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
        autoComplete="username"
        inputMode="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <Button
        type="submit"
        size="lg"
        loading={isSubmitting || done}
        className="mt-2"
      >
        Sign in
      </Button>
      <p className="text-center text-body-sm">
        <Link href="/forgot-password" className="text-accent hover:underline">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}

function MobileSignIn() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PhoneValues>({ resolver: zodResolver(phoneSchema) });
  const { formError, submit } = useSubmit(setError, ["phone"]);

  const onSubmit = submit(async (values: PhoneValues) => {
    const { data } = await apiFetch<VerificationSent>("auth/otp/request", {
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
      <Input
        label="Mobile number"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        hint="With the country code, for example +919876543210."
        error={errors.phone?.message}
        {...register("phone")}
      />
      <Button type="submit" size="lg" loading={isSubmitting} className="mt-2">
        Send code
      </Button>
    </form>
  );
}

export function LoginForm() {
  const next = useSearchParams().get("next");
  return (
    <Tabs defaultValue="email">
      <TabsList aria-label="How to sign in">
        <TabsTrigger value="email">Email</TabsTrigger>
        <TabsTrigger value="mobile">Mobile number</TabsTrigger>
      </TabsList>
      <TabsContent value="email" animate>
        <EmailSignIn next={next} />
      </TabsContent>
      <TabsContent value="mobile" animate>
        <MobileSignIn />
      </TabsContent>
    </Tabs>
  );
}
