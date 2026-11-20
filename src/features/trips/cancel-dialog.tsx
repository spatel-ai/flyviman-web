"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { CancellationTerms } from "@/components/shared/cancellation-terms";
import { FormAlert } from "@/components/shared/form-alert";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { applyApiError, messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatMoney } from "@/lib/format/money";
import { useAttemptKey } from "@/lib/idempotency";
import { cancelSchema, type CancelValues } from "./schema";

type CancellationQuote = Schemas["CancellationQuoteDto"];

/**
 * What cancelling would cost, with the conditions, shown before the customer
 * commits (rule 9). Confirming sends the charge that was shown; if it has
 * changed since, the new figures replace the old and the customer confirms
 * again.
 */
export function CancelDialog({
  reference,
  open,
  onOpenChange,
}: {
  reference: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Cancel this trip?"
        description="Check what cancelling costs before you confirm."
      >
        <CancelBody reference={reference} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

// Mounted only while open, so the figures are always read afresh.
function CancelBody({
  reference,
  onClose,
}: {
  reference: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const attempt = useAttemptKey();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<CancelValues>({
    resolver: zodResolver(cancelSchema),
    defaultValues: { reason: "" },
  });

  const quote = useQuery({
    queryKey: queryKeys.cancellationQuote(reference),
    queryFn: async () =>
      (
        await apiFetch<CancellationQuote>(
          `bookings/${encodeURIComponent(reference)}/cancellation-quote`,
        )
      ).data,
    // Money: always read afresh; the confirm button waits for the read.
    staleTime: 0,
  });

  const cancel = useMutation({
    mutationFn: ({
      figures,
      reason,
    }: {
      figures: CancellationQuote;
      reason: string;
    }) => {
      const body = {
        expectedChargeMinor: figures.chargeMinor,
        currency: "INR",
        ...(reason ? { reason } : {}),
      };
      return apiFetch(`bookings/${encodeURIComponent(reference)}/cancel`, {
        method: "POST",
        headers: { "Idempotency-Key": attempt.keyFor(body) },
        body,
      });
    },
    onSuccess: async () => {
      toast({ title: "Trip cancelled", tone: "success" });
      onClose();
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.booking(reference),
        }),
        queryClient.invalidateQueries({ queryKey: ["trips"] }),
      ]);
    },
    onError: async (failure) => {
      if (!(failure instanceof ApiError && failure.status === 0)) {
        attempt.rotate();
      }
      setError(applyApiError(failure, setFieldError, ["reason"]));
      if (failure instanceof ApiError && failure.status === 409) {
        // Show the figures as they are now, and refresh the trip behind.
        await Promise.all([
          quote.refetch(),
          queryClient.invalidateQueries({
            queryKey: queryKeys.booking(reference),
          }),
        ]);
      }
    },
  });

  if (quote.isPending) {
    return (
      <div role="status" aria-label="Checking the cost of cancelling">
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (quote.isError) {
    return (
      <div className="flex flex-col gap-4">
        {quote.error instanceof ApiError &&
        quote.error.code === "BOOKING_NOT_CANCELLABLE" ? (
          <p role="alert" className="text-danger">
            {messageFor(quote.error)}
          </p>
        ) : (
          <LoadError
            what="the cancellation figures"
            error={quote.error}
            onRetry={() => void quote.refetch()}
          />
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Close</Button>
          </DialogClose>
        </DialogFooter>
      </div>
    );
  }

  const figures = quote.data;
  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        setError(null);
        void handleSubmit((values) =>
          cancel.mutate({ figures, reason: values.reason }),
        )(event);
      }}
    >
      <FormAlert message={error} />
      <CancellationTerms
        summary={figures.terms.summary}
        charges={figures.terms.charges}
      />
      {figures.totalMinor != null ? (
        <PriceLabel
          amountMinor={figures.totalMinor}
          currency={figures.currency}
          priceType={figures.priceType}
          variant="compact"
          className="items-start"
        />
      ) : null}
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-body-sm">
        <dt className="text-muted">Time before departure</dt>
        <dd className="tabular-nums">{figures.hoursBeforeDeparture} hours</dd>
        {figures.amountKnown ? (
          <>
            <dt className="text-muted">Cancellation charge</dt>
            <dd className="tabular-nums">
              {formatMoney(figures.chargeMinor, figures.currency)}
            </dd>
            {figures.refundMinor != null ? (
              <>
                <dt className="text-muted">Refund due</dt>
                <dd className="tabular-nums">
                  {formatMoney(figures.refundMinor, figures.currency)}
                </dd>
              </>
            ) : null}
          </>
        ) : (
          <>
            <dt className="text-muted">Cancellation charge</dt>
            <dd>Not known yet</dd>
          </>
        )}
      </dl>
      <p className="text-body-sm text-muted">{figures.explanation}</p>
      <Textarea
        label="Reason (optional)"
        rows={2}
        maxLength={500}
        error={errors.reason?.message}
        {...register("reason")}
      />
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary">Keep trip</Button>
        </DialogClose>
        <Button
          type="submit"
          variant="destructive"
          loading={cancel.isPending || quote.isFetching}
        >
          Cancel this trip
        </Button>
      </DialogFooter>
    </form>
  );
}
