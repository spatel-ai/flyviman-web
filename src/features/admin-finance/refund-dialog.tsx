"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { PriceLabel } from "@/components/shared/price-label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/errors";
import { applyApiError } from "@/lib/api/messages";
import { startRefund, type RefundDue } from "@/lib/api/payments";
import { formatMoney, paiseToRupees } from "@/lib/format/money";
import { useAttemptKey } from "@/lib/idempotency";
import {
  REFUND_ALIASES,
  REFUND_FIELDS,
  refundSchema,
  type RefundFormInput,
  type RefundFormValues,
} from "./refund-schema";

/** Refusals after which the queue on screen is out of date. */
const STALE = new Set(["REFUND_EXCEEDS_REMAINDER", "PAYMENT_NOT_REFUNDABLE"]);

/**
 * Starts a refund for one row of the Due queue. Money moves, so it needs a
 * reason (audited) and sends an Idempotency-Key that survives a lost answer.
 */
export function RefundDialog({
  due,
  onClose,
}: {
  due: RefundDue | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={due !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {due ? (
        <DialogContent
          title={`Refund ${due.bookingReference}`}
          description="The money goes back to the customer's original payment method through the payment provider. This cannot be undone."
        >
          <RefundForm key={due.paymentReference} due={due} onDone={onClose} />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function RefundForm({ due, onDone }: { due: RefundDue; onDone: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const attempt = useAttemptKey();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RefundFormInput, unknown, RefundFormValues>({
    resolver: zodResolver(refundSchema(due.refundableMinor)),
    defaultValues: { amount: paiseToRupees(due.dueMinor), reason: "" },
  });

  async function onSubmit(values: RefundFormValues) {
    setFormError(null);
    const input = {
      amountMinor: values.amount,
      currency: due.currency as "INR",
      reason: values.reason,
    };
    try {
      await startRefund(
        due.paymentReference,
        input,
        attempt.keyFor({ payment: due.paymentReference, ...input }),
      );
      attempt.rotate();
      toast({
        title: "Refund started",
        description: `${formatMoney(values.amount, due.currency)} for ${due.bookingReference}.`,
        tone: "success",
      });
      void queryClient.invalidateQueries({ queryKey: ["admin", "refunds"] });
      onDone();
    } catch (error) {
      // Only a lost answer keeps the key, so a retry cannot refund twice.
      if (!(error instanceof ApiError && error.status === 0)) attempt.rotate();
      if (error instanceof ApiError && STALE.has(error.code)) {
        void queryClient.invalidateQueries({ queryKey: ["admin", "refunds"] });
      }
      setFormError(
        applyApiError(error, setError, REFUND_FIELDS, REFUND_ALIASES),
      );
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      <FormAlert message={formError} />
      <div className="flex flex-col gap-1 text-body-sm text-muted">
        <span>Still refundable on payment {due.paymentReference}</span>
        <PriceLabel
          amountMinor={due.refundableMinor}
          currency={due.currency}
          priceType="CONFIRMED"
          variant="compact"
        />
      </div>
      <Input
        label="Amount to refund (₹)"
        hint="Prefilled with what is due. Lower it for a partial refund."
        inputMode="decimal"
        autoComplete="off"
        className="h-10"
        error={errors.amount?.message}
        {...register("amount")}
      />
      <Textarea
        label="Reason"
        hint="Kept in the audit record. Not shown to the customer. No card or personal details."
        error={errors.reason?.message}
        {...register("reason")}
      />
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary" disabled={isSubmitting}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" loading={isSubmitting}>
          Refund
        </Button>
      </DialogFooter>
    </form>
  );
}
