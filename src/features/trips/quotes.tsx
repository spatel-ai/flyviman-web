"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CancellationTerms } from "@/components/shared/cancellation-terms";
import { FormAlert } from "@/components/shared/form-alert";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ConfirmDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format/date";
import { useAttemptKey } from "@/lib/idempotency";
import { useQuotes } from "./hooks";

type Quote = Schemas["QuoteResponseDto"];

const CLOSED_WORDS: Record<string, string> = {
  ACCEPTED: "You accepted this quote.",
  REJECTED: "You declined this quote.",
  EXPIRED: "This quote has expired.",
  SUPERSEDED: "The operator replaced this quote with a newer one.",
};

/** The operator's quotes on a trip, newest first. Nothing here is a price until accepted. */
export function Quotes({ reference }: { reference: string }) {
  const quotes = useQuotes(reference);
  if (quotes.isPending) return <Skeleton className="h-32" />;
  if (quotes.isError) {
    return (
      <LoadError
        what="the quotes"
        error={quotes.error}
        onRetry={() => void quotes.refetch()}
      />
    );
  }
  if (quotes.data.length === 0) return null;
  return (
    <section aria-labelledby="quotes-heading" className="flex flex-col gap-4">
      <h2 id="quotes-heading" className="text-title">
        Quotes
      </h2>
      {quotes.data.map((quote) => (
        <QuoteCard key={quote.reference} quote={quote} reference={reference} />
      ))}
    </section>
  );
}

function QuoteCard({ quote, reference }: { quote: Quote; reference: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const attempt = useAttemptKey();
  const [dialog, setDialog] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A quote past its validity or already answered is no longer offered.
  const lapsed = !quote.open && quote.status === "SENT";

  const answer = useMutation({
    mutationFn: (verb: "accept" | "reject") =>
      apiFetch(`quotes/${encodeURIComponent(quote.reference)}/${verb}`, {
        method: "POST",
        headers: { "Idempotency-Key": attempt.keyFor(verb) },
      }),
    onSuccess: async (_data, verb) => {
      setDialog(null);
      toast({
        title: verb === "accept" ? "Quote accepted" : "Quote declined",
        tone: "success",
      });
      await invalidate();
    },
    onError: async (failure) => {
      if (!(failure instanceof ApiError && failure.status === 0)) {
        attempt.rotate();
      }
      setError(messageFor(failure));
      // A conflict means the quote or the trip moved on: show it as it is now.
      if (failure instanceof ApiError && failure.status === 409) {
        await invalidate();
      }
    },
  });

  function invalidate() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.booking(reference) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tripsAll }),
    ]);
  }

  function close(open: boolean) {
    if (!open) {
      setDialog(null);
      setError(null);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <PriceLabel
        amountMinor={quote.price.amountMinor}
        currency={quote.price.currency}
        priceType={quote.price.priceType}
        validUntil={
          quote.status === "SENT" ? quote.price.validUntil : undefined
        }
        expired={lapsed || (!quote.open && quote.status !== "ACCEPTED")}
      />
      {quote.open ? null : (
        <p className="text-body-sm text-muted">
          {lapsed
            ? `This quote lapsed on ${formatDateTime(quote.price.validUntil)}.`
            : (CLOSED_WORDS[quote.status] ?? quote.status)}
        </p>
      )}
      <CancellationTerms
        summary={quote.conditions.summary}
        charges={quote.conditions.charges}
      />
      {quote.conditions.inclusions.length > 0 ? (
        <p className="text-body-sm text-muted">
          Included: {quote.conditions.inclusions.join(", ")}
        </p>
      ) : null}
      {quote.conditions.exclusions.length > 0 ? (
        <p className="text-body-sm text-muted">
          Not included: {quote.conditions.exclusions.join(", ")}
        </p>
      ) : null}
      {quote.open ? (
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setDialog("accept")}>Accept quote</Button>
          <Button variant="secondary" onClick={() => setDialog("decline")}>
            Decline quote
          </Button>
        </div>
      ) : null}

      <Dialog open={dialog === "accept"} onOpenChange={close}>
        <DialogContent
          title="Accept this quote?"
          description="You agree to the price on the cancellation conditions below."
        >
          <div className="flex flex-col gap-4">
            <FormAlert message={error} />
            <PriceLabel
              amountMinor={quote.price.amountMinor}
              currency={quote.price.currency}
              priceType={quote.price.priceType}
              validUntil={quote.price.validUntil}
            />
            <CancellationTerms
              summary={quote.conditions.summary}
              charges={quote.conditions.charges}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Not now</Button>
              </DialogClose>
              <Button
                loading={answer.isPending}
                onClick={() => {
                  setError(null);
                  answer.mutate("accept");
                }}
              >
                Accept quote
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={dialog === "decline"}
        onOpenChange={close}
        title="Decline this quote?"
        description="The request closes and the aircraft is released. This cannot be undone."
        confirmLabel="Decline quote"
        destructive
        loading={answer.isPending}
        onConfirm={() => {
          setError(null);
          answer.mutate("reject");
        }}
      />
      {dialog === "decline" && error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
