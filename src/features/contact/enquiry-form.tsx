"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CONTACT_PAGE, ENQUIRY_TOPICS } from "@/content/contact";
import { apiFetch } from "@/lib/api/client";
import { applyApiError } from "@/lib/api/messages";
import type { Schemas } from "@/lib/api/types";
import {
  enquirySchema,
  toEnquiryBody,
  topicFrom,
  type EnquiryOutput,
  type EnquiryValues,
} from "./schema";

type EnquiryReceipt = Schemas["EnquiryResponseDto"];

const FIELDS = ["name", "email", "phone", "topic", "message"] as const;

/**
 * A random key for one enquiry. `crypto.randomUUID` exists only on secure
 * pages (https or localhost); a phone testing over a local network address
 * gets the same format from `getRandomValues`.
 */
function newKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4),
    hex.slice(4, 6),
    hex.slice(6, 8),
    hex.slice(8, 10),
    hex.slice(10),
  ]
    .map((part) => part.join(""))
    .join("-");
}

/**
 * A sales enquiry to the operations team. Never animated (motion-design.md:
 * nothing moves near a form). One key per enquiry, so a repeated submission
 * (a double tap, a retry after a dropped connection) creates one enquiry.
 */
export function EnquiryForm() {
  const searchParams = useSearchParams();
  const [key, setKey] = useState(newKey);
  const sentHeading = useRef<HTMLHeadingElement>(null);
  const [receipt, setReceipt] = useState<EnquiryReceipt | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EnquiryValues, unknown, EnquiryOutput>({
    resolver: zodResolver(enquirySchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      topic: topicFrom(searchParams.get("topic")),
      message: "",
    },
  });

  // The confirmation replaces the form, and with it the focused button:
  // move focus to the confirmation so it is read out.
  useEffect(() => {
    if (receipt) sentHeading.current?.focus();
  }, [receipt]);

  const medical = useWatch({ control, name: "topic" }) === "MEDICAL_CHARTER";

  async function onSubmit(values: EnquiryOutput) {
    setFormError(null);
    try {
      const { data } = await apiFetch<EnquiryReceipt>("enquiries", {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: toEnquiryBody(values),
      });
      setReceipt(data);
    } catch (error) {
      setFormError(applyApiError(error, setError, FIELDS));
    }
  }

  if (receipt) {
    const { sent } = CONTACT_PAGE.form;
    return (
      <div role="status" className="rounded-xl bg-surface p-6 md:p-8">
        <h3 ref={sentHeading} tabIndex={-1} className="text-h3 outline-none">
          {sent.title}
        </h3>
        <p className="mt-3 text-body text-muted">
          {sent.text}{" "}
          <span className="font-medium text-foreground tabular-nums">
            {receipt.reference}
          </span>
          .
        </p>
        <Button
          variant="secondary"
          className="mt-6"
          onClick={() => {
            reset();
            setKey(newKey());
            setReceipt(null);
          }}
        >
          Send another enquiry
        </Button>
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
        label="Name"
        autoComplete="name"
        error={errors.name?.message}
        {...register("name")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          hint="An email address or a phone number, so we can reply."
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
          placeholder="+91"
          error={errors.phone?.message}
          {...register("phone")}
        />
      </div>
      <Controller
        control={control}
        name="topic"
        render={({ field }) => (
          <Select
            label="What is it about?"
            name={field.name}
            value={field.value}
            onValueChange={field.onChange}
            options={[...ENQUIRY_TOPICS]}
            error={errors.topic?.message}
          />
        )}
      />
      {medical ? (
        // Never animated (rule 7). Health details do not belong in a
        // sales enquiry (rule 8).
        <p className="rounded-sm bg-surface px-3.5 py-2.5 text-body-sm font-medium text-foreground">
          {CONTACT_PAGE.form.medicalNotice}
        </p>
      ) : null}
      <Textarea
        label="Message"
        hint="Your route, dates and number of passengers help us reply faster."
        error={errors.message?.message}
        {...register("message")}
      />
      <div>
        <Button type="submit" size="lg" loading={isSubmitting}>
          Send enquiry
        </Button>
      </div>
    </form>
  );
}
