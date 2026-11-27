"use client";

import { useState } from "react";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, Dialog, DialogContent } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import type { Schemas } from "@/lib/api/types";
import { QuoteForm } from "./quote-form";
import { canAccept, canRespond } from "./status";
import { TextDialog } from "./text-dialog";
import type { Act } from "./use-act";

type Detail = Schemas["OperatorBookingRequestDetailDto"];
type Which = "accept" | "reject" | "clarify" | "quote";

/**
 * What can be done with the request now, from its status (the API decides
 * again on every call). Accept is offered only for a priced request with no
 * quote out; a request priced on request is answered with a quote.
 */
export function RequestActions({
  request,
  act,
  finished,
  conflict,
  problem,
}: {
  request: Detail;
  act: Act;
  finished: (message: string) => Promise<void>;
  conflict: (error: unknown) => boolean;
  problem: string | null;
}) {
  const [open, setOpen] = useState<Which | null>(null);
  // One key per opening of the accept dialog, reused if the call is retried.
  const [key, setKey] = useState("");
  const [otherError, setOtherError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const base = `operator/booking-requests/${encodeURIComponent(request.reference)}`;
  const accept = canAccept(request);
  const respond = canRespond(request);

  if (!accept && !respond) {
    return <FormAlert message={problem ?? otherError} />;
  }

  function show(which: Which) {
    if (which === "accept") setKey(crypto.randomUUID());
    setOtherError(null);
    setOpen(which);
  }
  const close = (next: boolean) => {
    if (!next && !pending) setOpen(null);
  };

  /** A confirmation dialog's call: any failure closes it and shows on the page. */
  async function confirmed(done: string, call: () => Promise<unknown>) {
    setPending(true);
    try {
      await act(done, call);
    } catch (error) {
      setOtherError(messageFor(error));
    } finally {
      setPending(false);
      setOpen(null);
    }
  }

  const revising = request.quotes.length > 0;

  return (
    <Card variant="raised" className="flex flex-col gap-4">
      <div>
        <h2 className="text-title">Your answer</h2>
        <p className="mt-1 text-body-sm text-muted">
          {request.price === null
            ? "This request is priced on request: send a quote, or ask the customer a question."
            : accept
              ? "Accept at the proposed price, or send your own quote."
              : "A quote is with the customer. Send a revised one to replace it."}
        </p>
      </div>
      <FormAlert message={problem ?? otherError} />
      <div className="flex flex-wrap gap-3">
        {accept ? (
          <Button className="h-11" onClick={() => show("accept")}>
            Accept
          </Button>
        ) : null}
        <Button
          variant={accept ? "secondary" : "primary"}
          className="h-11"
          onClick={() => show("quote")}
        >
          {revising ? "Revise quote" : "Send a quote"}
        </Button>
        <Button
          variant="secondary"
          className="h-11"
          onClick={() => show("clarify")}
        >
          Ask a question
        </Button>
        <Button
          variant="danger"
          className="h-11"
          onClick={() => show("reject")}
        >
          Reject
        </Button>
      </div>

      {open === "accept" ? (
        <ConfirmDialog
          open
          onOpenChange={close}
          title="Accept this request?"
          description="You agree to fly this trip at the proposed price shown on this page. The customer is told the price is confirmed and your aircraft stays held for them. It is not a confirmed booking until they have paid."
          confirmLabel="Accept request"
          loading={pending}
          onConfirm={() =>
            void confirmed("Request accepted at the proposed price", () =>
              apiFetch(`${base}/accept`, {
                method: "POST",
                headers: { "Idempotency-Key": key },
              }),
            )
          }
        />
      ) : null}

      {open === "reject" ? (
        <ConfirmDialog
          open
          onOpenChange={close}
          title="Reject this request?"
          description="The aircraft is released and the customer is told the request was not accepted. Your reason is kept for you and Flyviman, not shown to the customer."
          confirmLabel="Reject request"
          destructive
          requireReason
          loading={pending}
          onConfirm={(reason) =>
            void confirmed("Request rejected", () =>
              apiFetch(`${base}/reject`, { method: "POST", body: { reason } }),
            )
          }
        />
      ) : null}

      <TextDialog
        open={open === "clarify"}
        onOpenChange={close}
        title="Ask the customer a question"
        description="The customer is asked to answer. Your aircraft stays held for another 48 hours; unanswered by then, the request expires."
        label="Your question"
        submitLabel="Send question"
        maxLength={2000}
        onSubmit={(message) =>
          act("Question sent", () =>
            apiFetch(`${base}/clarify`, {
              method: "POST",
              body: { message },
            }),
          )
        }
      />

      <Dialog open={open === "quote"} onOpenChange={close}>
        {open === "quote" ? (
          <DialogContent
            title={revising ? "Revise your quote" : "Send a quote"}
            description="The customer sees this as a quote, with your cancellation conditions, before they accept."
          >
            <QuoteForm
              request={request}
              onFailed={(error) => {
                if (conflict(error)) {
                  setOpen(null);
                  return true;
                }
                return false;
              }}
              onSent={async () => {
                setOpen(null);
                await finished("Quote sent");
              }}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </Card>
  );
}
