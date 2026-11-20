"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { applyApiError } from "@/lib/api/messages";
import type { Schemas } from "@/lib/api/types";
import {
  quoteDefaults,
  quoteSchema,
  toReviseQuoteBody,
  type QuoteValues,
} from "./quote-schema";

type Detail = Schemas["OperatorBookingRequestDetailDto"];

const FIELDS = [
  "price",
  "validDate",
  "summary",
  "inclusions",
  "exclusions",
] as const;

/** API field names mapped to the form's own. */
const ALIASES = {
  totalMinor: "price",
  validUntil: "validDate",
  "conditions.summary": "summary",
  "conditions.inclusions": "inclusions",
  "conditions.exclusions": "exclusions",
} as const;

/**
 * Sends a quote, or a revision that replaces the open one. Everything the
 * form knows about the request body is in quote-schema.ts (`toReviseQuoteBody`),
 * so a change to what the operator enters is made there. Mounted only while
 * its dialog is open.
 */
export function QuoteForm({
  request,
  onSent,
  onFailed,
}: {
  request: Pick<Detail, "reference" | "quotes" | "cancellationTerms" | "legs">;
  onSent: () => Promise<void>;
  /** Called with a failure the form cannot show under a field; returns true when it handled it (a conflict). */
  onFailed: (error: unknown) => boolean;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const revising = request.quotes.length > 0;
  const [schema] = useState(() =>
    quoteSchema({ departureAt: request.legs[0].departureAt }),
  );
  const [defaults] = useState(() => quoteDefaults(request, Date.now()));
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<QuoteValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });
  const charges = useFieldArray({ control, name: "charges" });

  async function onSubmit(values: QuoteValues) {
    setFormError(null);
    try {
      await apiFetch(
        `operator/booking-requests/${encodeURIComponent(request.reference)}/revise-quote`,
        { method: "POST", body: toReviseQuoteBody(values) },
      );
      await onSent();
    } catch (error) {
      if (onFailed(error)) return;
      setFormError(applyApiError(error, setError, FIELDS, ALIASES));
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      <FormAlert message={formError} />
      <Input
        label="Your price (₹)"
        inputMode="decimal"
        autoComplete="off"
        hint="In rupees. The customer sees it as a quote until they accept."
        className="h-10"
        error={errors.price?.message}
        {...register("price")}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-body-sm font-medium">
          Valid until (India time)
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Date"
            type="date"
            className="h-10"
            error={errors.validDate?.message}
            {...register("validDate")}
          />
          <Input
            label="Time"
            type="time"
            className="h-10"
            error={errors.validTime?.message}
            {...register("validTime")}
          />
        </div>
        <p className="text-caption text-muted">
          At least an hour from now, and not after the departure. Your aircraft
          stays held until then.
        </p>
      </fieldset>
      <Textarea
        label="Cancellation conditions"
        hint="Shown to the customer before they accept."
        rows={3}
        error={errors.summary?.message}
        {...register("summary")}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-body-sm font-medium">
          Cancellation charges
        </legend>
        {charges.fields.length === 0 ? (
          <p className="text-body-sm text-muted">
            None: nothing is charged on cancellation.
          </p>
        ) : null}
        {charges.fields.map((field, index) => (
          <div key={field.id} className="flex items-start gap-2">
            <Input
              label="Hours before departure"
              inputMode="numeric"
              className="h-10"
              error={errors.charges?.[index]?.hours?.message}
              {...register(`charges.${index}.hours`)}
            />
            <Input
              label="Charge (% of total)"
              inputMode="numeric"
              className="h-10"
              error={errors.charges?.[index]?.percent?.message}
              {...register(`charges.${index}.percent`)}
            />
            <Button
              variant="secondary"
              className="mt-7 h-10"
              aria-label={`Remove charge ${index + 1}`}
              onClick={() => charges.remove(index)}
            >
              Remove
            </Button>
          </div>
        ))}
        {errors.charges?.message ? (
          <p role="alert" className="text-body-sm text-danger">
            {errors.charges.message}
          </p>
        ) : null}
        <Button
          variant="secondary"
          className="h-10 self-start"
          onClick={() => charges.append({ hours: "", percent: "" })}
        >
          Add a charge
        </Button>
      </fieldset>
      <Textarea
        label="What the price includes"
        hint="One per line."
        rows={3}
        error={errors.inclusions?.message}
        {...register("inclusions")}
      />
      <Textarea
        label="What it leaves out"
        hint="One per line."
        rows={3}
        error={errors.exclusions?.message}
        {...register("exclusions")}
      />
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary" className="h-10">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" className="h-10" loading={isSubmitting}>
          {revising ? "Send revised quote" : "Send quote"}
        </Button>
      </DialogFooter>
    </form>
  );
}
