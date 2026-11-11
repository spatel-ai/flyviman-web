"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import type { User } from "@/lib/api/types";
import { destinationAfterLogin } from "@/lib/auth/roles";
import { FormAlert } from "@/components/shared/form-alert";
import { codeSchema, type CodeValues } from "./schema";
import { TicketDivider } from "./ticket-divider";
import { useSubmit } from "./use-submit";

export function VerifyForm() {
  const params = useSearchParams();
  // The ID of the attempt this browser started. Without it a code is useless,
  // which is what stops anyone else from completing the registration.
  const verificationId = params.get("id");
  const destination = params.get("to");

  const [done, setDone] = useState(false);
  const [resend, setResend] = useState<
    | { state: "idle" | "sending" }
    | { state: "sent" | "failed"; message: string }
  >({ state: "idle" });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CodeValues>({ resolver: zodResolver(codeSchema) });
  const { formError, submit } = useSubmit(setError, ["code"]);

  if (!verificationId) {
    return (
      <p className="text-muted">
        There is nothing to verify here.{" "}
        <Link href="/register" className="text-accent hover:underline">
          Create an account
        </Link>{" "}
        or{" "}
        <Link href="/login" className="text-accent hover:underline">
          sign in
        </Link>
        .
      </p>
    );
  }

  const onSubmit = submit(async (values: CodeValues) => {
    const { data } = await apiFetch<User>("auth/otp/verify", {
      method: "POST",
      body: { verificationId, code: values.code.trim() },
    });
    setDone(true);
    window.location.assign(destinationAfterLogin(data.role));
  });

  async function sendAgain() {
    setResend({ state: "sending" });
    try {
      await apiFetch("auth/otp/request", {
        method: "POST",
        body: { verificationId },
      });
      setResend({ state: "sent", message: "We have sent a new code." });
    } catch (error) {
      setResend({ state: "failed", message: messageFor(error) });
    }
  }

  return (
    <>
      <p className="mb-6 text-muted">
        Enter the six-digit code we sent
        {destination ? (
          <>
            {" "}
            to{" "}
            <span className="font-medium text-foreground">{destination}</span>
          </>
        ) : null}
        . It expires in five minutes.
      </p>
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        className="flex flex-col gap-4"
      >
        <FormAlert message={formError} />
        <Input
          label="Verification code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          error={errors.code?.message}
          {...register("code")}
        />
        <Button
          type="submit"
          size="lg"
          loading={isSubmitting || done}
          className="mt-2"
        >
          Verify
        </Button>
      </form>
      <TicketDivider />
      <div className="flex flex-col items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          loading={resend.state === "sending"}
          onClick={() => void sendAgain()}
        >
          Send a new code
        </Button>
        {"message" in resend ? (
          <p
            role="status"
            className={
              resend.state === "failed"
                ? "text-body-sm text-danger"
                : "text-body-sm text-muted"
            }
          >
            {resend.message}
          </p>
        ) : null}
      </div>
    </>
  );
}
