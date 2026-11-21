"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { applyApiError, messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import {
  quoteAmountMinor,
  quoteSchema,
  requoteSchema,
  type QuoteOutput,
  type QuoteValues,
} from "./schema";

type Operator = Schemas["AirAmbulanceOperatorDto"];

/**
 * Sends (or, while QUOTED, replaces) the customer's quote, from an operator
 * the API lists as eligible: approved, with an approved air ambulance
 * aircraft (W4-6).
 */
export function QuoteForm({
  path,
  revising = false,
  onSent,
}: {
  path: string;
  /** True while the request is QUOTED: a replacement needs a reason. */
  revising?: boolean;
  onSent: (failure?: unknown) => void;
}) {
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const operators = useQuery({
    queryKey: queryKeys.adminAirAmbulanceOperators,
    queryFn: () => apiFetch<Operator[]>("admin/air-ambulance/operators"),
  });
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<QuoteValues, unknown, QuoteOutput>({
    resolver: zodResolver(revising ? requoteSchema : quoteSchema),
    defaultValues: {
      operatorId: "",
      amount: "",
      conditions: "",
      revisionReason: "",
    },
  });

  const send = useMutation({
    mutationFn: (values: QuoteOutput) =>
      apiFetch(`${path}/quote`, {
        method: "POST",
        body: {
          operatorId: values.operatorId,
          amountMinor: quoteAmountMinor(values.amount) ?? 0,
          currency: "INR",
          conditions: values.conditions,
          ...(revising ? { revisionReason: values.revisionReason } : {}),
        } satisfies Schemas["QuoteAirAmbulanceDto"],
      }),
    onSuccess: () => {
      setFormError(null);
      toast({ title: "Quote sent to the customer", tone: "success" });
      onSent();
    },
    onError: (failure) => {
      if (
        failure instanceof ApiError &&
        (failure.code === "AIR_AMBULANCE_OPERATOR_NOT_ELIGIBLE" ||
          failure.code === "OPERATOR_NOT_APPROVED")
      ) {
        setError("operatorId", {
          message:
            failure.code === "OPERATOR_NOT_APPROVED"
              ? "This operator is no longer approved. Choose another."
              : messageFor(failure),
        });
        void operators.refetch();
        setFormError(null);
      } else {
        setFormError(
          applyApiError(
            failure,
            setError,
            ["operatorId", "conditions", "revisionReason"],
            {
              amountMinor: "amount",
            },
          ),
        );
      }
      onSent(failure);
    },
  });

  const options = (operators.data?.data ?? []).map((operator) => ({
    value: operator.id,
    label: operator.name,
  }));

  return (
    <form
      noValidate
      aria-label="Quote"
      className="flex flex-col gap-4"
      onSubmit={(event) =>
        void handleSubmit((values) => send.mutate(values))(event)
      }
    >
      <FormAlert
        message={
          formError ??
          (operators.isError
            ? `We could not load the operators. ${messageFor(operators.error)}`
            : null)
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="operatorId"
          render={({ field, fieldState }) => (
            <Select
              label="Operator"
              placeholder={
                operators.isPending
                  ? "Loading…"
                  : options.length === 0
                    ? "No eligible operator"
                    : "Choose an operator"
              }
              options={options}
              value={field.value}
              onValueChange={field.onChange}
              name={field.name}
              hint="Approved operators with an approved air ambulance aircraft."
              error={fieldState.error?.message}
            />
          )}
        />
        <Input
          label="Amount (₹)"
          inputMode="decimal"
          hint="Including taxes and fees, up to ₹2 crore."
          error={errors.amount?.message}
          {...register("amount")}
        />
      </div>
      <Textarea
        label="Conditions"
        rows={3}
        hint="Service and cancellation conditions the customer sees before accepting. No medical details."
        error={errors.conditions?.message}
        {...register("conditions")}
      />
      {revising ? (
        <Textarea
          label="Reason for the new quote"
          rows={2}
          hint="Kept in the request's timeline. No patient details."
          error={errors.revisionReason?.message}
          {...register("revisionReason")}
        />
      ) : null}
      <div>
        <Button type="submit" variant="secondary" loading={send.isPending}>
          Send quote
        </Button>
      </div>
    </form>
  );
}
