"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/errors";
import { applyApiError } from "@/lib/api/messages";
import { updateSettlement, type AdminSettlement } from "@/lib/api/payments";
import { queryKeys } from "@/lib/api/query-keys";
import { useAttemptKey } from "@/lib/idempotency";
import {
  SETTLEMENT_ACTIONS,
  SETTLEMENT_FIELDS,
  settlementSchema,
  type SettlementFormInput,
  type SettlementFormValues,
} from "./settlement-schema";

/** Refusals after which the list on screen is out of date. */
const STALE = new Set([
  "SETTLEMENT_NOT_DUE",
  "SETTLEMENT_CHANGED",
  "SETTLEMENT_ALREADY_PAID",
  "SETTLEMENT_INVALID_TRANSITION",
]);

/**
 * Holds, releases or marks one settlement paid. The payout itself is made
 * by bank transfer outside Flyviman; this records it, with a reason
 * (audited) and an Idempotency-Key that survives a lost answer.
 */
export function SettlementDialog({
  settlement,
  onClose,
}: {
  settlement: AdminSettlement | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={settlement !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {settlement ? (
        <DialogContent
          title={`Settlement for ${settlement.bookingReference}`}
          description={`${settlement.operatorName}. Marking it paid records a bank transfer you have already made; it cannot be undone.`}
        >
          <SettlementForm
            key={settlement.id}
            settlement={settlement}
            onDone={onClose}
          />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function SettlementForm({
  settlement,
  onDone,
}: {
  settlement: AdminSettlement;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const attempt = useAttemptKey();
  const [formError, setFormError] = useState<string | null>(null);
  const actions = SETTLEMENT_ACTIONS[settlement.status] ?? [];
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SettlementFormInput, unknown, SettlementFormValues>({
    resolver: zodResolver(settlementSchema),
    defaultValues: {
      status: actions[0]?.value ?? "ON_HOLD",
      reason: "",
      paymentReference: "",
    },
  });
  const paying = useWatch({ control, name: "status" }) === "PAID";

  async function onSubmit(values: SettlementFormValues) {
    setFormError(null);
    const input =
      values.status === "PAID"
        ? {
            status: values.status,
            reason: values.reason,
            paymentReference: values.paymentReference,
            expectedPayableMinor: settlement.payableMinor,
          }
        : { status: values.status, reason: values.reason };
    try {
      await updateSettlement(
        settlement.id,
        input,
        attempt.keyFor({ id: settlement.id, ...input }),
      );
      attempt.rotate();
      toast({
        title:
          values.status === "PAID"
            ? "Settlement marked paid"
            : values.status === "ON_HOLD"
              ? "Settlement on hold"
              : "Hold released",
        description: settlement.bookingReference,
        tone: "success",
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.adminSettlementsAll,
      });
      onDone();
    } catch (error) {
      // Only a lost answer keeps the key, so a retry cannot record it twice.
      if (!(error instanceof ApiError && error.status === 0)) attempt.rotate();
      if (error instanceof ApiError && STALE.has(error.code)) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.adminSettlementsAll,
        });
      }
      setFormError(applyApiError(error, setError, SETTLEMENT_FIELDS));
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
        <span>Payable to the operator</span>
        <PriceLabel
          amountMinor={settlement.payableMinor}
          currency={settlement.currency}
          priceType="CONFIRMED"
          variant="compact"
        />
      </div>
      <Controller
        control={control}
        name="status"
        render={({ field }) => (
          <Select
            label="Action"
            options={actions}
            value={field.value}
            onValueChange={field.onChange}
            name={field.name}
            error={errors.status?.message}
            className="h-10"
          />
        )}
      />
      {paying ? (
        <Input
          label="Bank transfer reference"
          hint="The reference of the payout you made to the operator."
          autoComplete="off"
          className="h-10"
          error={errors.paymentReference?.message}
          {...register("paymentReference")}
        />
      ) : null}
      <Textarea
        label="Reason"
        hint="Kept in the audit record. No bank account or personal details."
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
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
