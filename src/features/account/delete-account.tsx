"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";
import type { Me, Schemas } from "@/lib/api/types";
import { useMe } from "@/lib/api/use-me";
import { erasureBlockerMessages } from "./erasure";
import {
  eraseCodeSchema,
  erasePasswordSchema,
  type EraseCodeValues,
  type ErasePasswordValues,
} from "./schema";

type EraseBody = Schemas["EraseMyAccountDto"];
type CodeSent = Schemas["VerificationSentResponseDto"];

const ERASED = [
  "Your name, email address, mobile number and password.",
  "Your saved passengers.",
  "Passenger names, identity documents and special requests on your past trips.",
  "Contact details, addresses, medical details and documents on your past air ambulance requests.",
  "Your notifications and your sign-ins on every device.",
];

const KEPT = [
  "Booking references, routes, dates, prices, payments and refunds, without your name: the law requires us to keep financial records.",
  "The record of the terms and privacy policy you accepted, as proof that you agreed to them.",
  "Our audit log, which records what happened to your account without your personal details.",
];

/**
 * "Delete my account" on the profile page (customers only): what is erased
 * and what is kept, confirmation with the password (or a code for accounts
 * registered with a mobile number), then a final confirmation. Afterwards
 * the session is ended and the customer lands on the home page.
 */
export function DeleteAccount() {
  const me = useMe();
  if (me.data?.role !== "CUSTOMER") return null;
  return <DeleteAccountSection me={me.data} />;
}

function DeleteAccountSection({ me }: { me: Me }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pending, setPending] = useState<EraseBody | null>(null);
  const [erasing, setErasing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [fieldError, setFieldError] = useState<string | null>(null);
  // Accounts registered with an email address have a password; those
  // registered with a mobile number confirm with a code instead.
  const withPassword = Boolean(me.email);

  function ready(body: EraseBody) {
    setProblem(null);
    setBlockers([]);
    setFieldError(null);
    setPending(body);
  }

  async function erase(body: EraseBody) {
    setErasing(true);
    try {
      await apiFetch<null>("me/erasure", { method: "POST", body });
    } catch (error) {
      setErasing(false);
      setPending(null);
      const reasons = erasureBlockerMessages(error);
      if (reasons.length > 0) {
        setBlockers(reasons);
      } else if (
        error instanceof ApiError &&
        error.code === "AUTH_INVALID_CREDENTIALS"
      ) {
        setFieldError("The password is not correct.");
      } else if (
        error instanceof ApiError &&
        error.code === "AUTH_OTP_INVALID"
      ) {
        setFieldError("That code is not correct. Check it and try again.");
      } else if (
        error instanceof ApiError &&
        error.code === "AUTH_OTP_EXPIRED"
      ) {
        setFieldError(
          "That code has expired or was already used. Send a new one.",
        );
      } else {
        setProblem(messageFor(error));
      }
      return;
    }
    // The account and every sign-in are gone; clear this browser's cookies.
    await apiFetch<null>("auth/logout", { method: "POST" }).catch(
      () => undefined,
    );
    queryClient.clear();
    toast({ title: "Your account has been deleted", tone: "success" });
    router.replace("/");
    router.refresh();
  }

  return (
    <section
      aria-labelledby="delete-account-heading"
      className="mt-12 flex max-w-reading flex-col gap-4 border-t border-border/60 pt-8"
    >
      <h2 id="delete-account-heading" className="text-title">
        Delete my account
      </h2>
      <p className="text-body-sm text-muted">
        Deleting your account erases your personal data at once and signs you
        out everywhere. It cannot be undone. You can register again later with
        the same email address or mobile number, as a new account.
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="text-body-sm font-medium">What we erase</h3>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-body-sm text-muted">
            {ERASED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-body-sm font-medium">What we keep, and why</h3>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-body-sm text-muted">
            {KEPT.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-body-sm text-muted">
        An account can be deleted only when nothing on it is still open: no trip
        or request in progress, no payment being processed and no refund still
        to reach you.
      </p>

      {blockers.length > 0 ? (
        <div
          role="alert"
          className="rounded-sm bg-danger/12 px-3.5 py-2.5 text-body-sm text-danger"
        >
          <p className="font-medium">Your account cannot be deleted yet.</p>
          <ul className="mt-1 flex list-disc flex-col gap-1 pl-5">
            {blockers.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <FormAlert message={problem} />

      {withPassword ? (
        <PasswordConfirm onReady={ready} serverError={fieldError} />
      ) : (
        <CodeConfirm onReady={ready} serverError={fieldError} />
      )}

      {pending ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open && !erasing) setPending(null);
          }}
          title="Delete your account?"
          description="Your personal data is erased now and you are signed out. This cannot be undone."
          confirmLabel="Delete permanently"
          destructive
          loading={erasing}
          onConfirm={() => void erase(pending)}
        />
      ) : null}
    </section>
  );
}

function PasswordConfirm({
  onReady,
  serverError,
}: {
  onReady: (body: EraseBody) => void;
  serverError: string | null;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ErasePasswordValues>({
    resolver: zodResolver(erasePasswordSchema),
    defaultValues: { password: "" },
  });

  return (
    <form
      noValidate
      onSubmit={(event) =>
        void handleSubmit((values) => onReady({ password: values.password }))(
          event,
        )
      }
      className="flex flex-col gap-4"
    >
      <Input
        label="Your password"
        type="password"
        autoComplete="current-password"
        hint="To confirm it is you."
        error={errors.password?.message ?? serverError ?? undefined}
        {...register("password")}
      />
      <p className="text-caption text-muted">
        Forgotten it?{" "}
        <Link href="/forgot-password" className="text-accent hover:underline">
          Reset your password
        </Link>{" "}
        first.
      </p>
      <div>
        <Button type="submit" variant="destructive">
          Delete my account
        </Button>
      </div>
    </form>
  );
}

function CodeConfirm({
  onReady,
  serverError,
}: {
  onReady: (body: EraseBody) => void;
  serverError: string | null;
}) {
  const [sent, setSent] = useState<CodeSent | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EraseCodeValues>({
    resolver: zodResolver(eraseCodeSchema),
    defaultValues: { code: "" },
  });

  async function send() {
    setSending(true);
    setSendError(null);
    try {
      const { data } = await apiFetch<CodeSent>("me/erasure/code", {
        method: "POST",
      });
      setSent(data);
      reset({ code: "" });
    } catch (error) {
      setSendError(messageFor(error));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <FormAlert message={sendError} />
      {sent ? (
        <form
          noValidate
          onSubmit={(event) =>
            void handleSubmit((values) =>
              onReady({
                verificationId: sent.verificationId,
                code: values.code,
              }),
            )(event)
          }
          className="flex flex-col gap-4"
        >
          <Input
            label="Code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            hint={`We sent a six-digit code to ${sent.destination}.`}
            error={errors.code?.message ?? serverError ?? undefined}
            {...register("code")}
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="destructive">
              Delete my account
            </Button>
            <Button
              variant="secondary"
              loading={sending}
              onClick={() => void send()}
            >
              Send a new code
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <p className="mb-3 text-body-sm text-muted">
            To confirm it is you, we will send a code to your mobile number.
          </p>
          <Button
            variant="secondary"
            loading={sending}
            onClick={() => void send()}
          >
            Send a code
          </Button>
        </div>
      )}
    </div>
  );
}
