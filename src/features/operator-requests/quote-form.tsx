"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { CancellationTerms } from "@/components/shared/cancellation-terms";
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

const FIELDS = ["price", "validDate", "inclusions", "exclusions"] as const;

/** API field names mapped to the form's own. */
const ALIASES = {
  operatorPriceMinor: "price",
  validUntil: "validDate",
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
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<QuoteValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

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
        hint="In rupees, before Flyviman's charges. Flyviman's fees and taxes are added for the customer, who sees the total as a quote until they accept."
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
      <div className="flex flex-col gap-1">
        <CancellationTerms
          summary={request.cancellationTerms.summary}
          charges={request.cancellationTerms.charges}
        />
        <p className="text-caption text-muted">
          Flyviman&apos;s terms, the same for every operator. The quote shows
          them to the customer before they accept.
        </p>
      </div>
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
