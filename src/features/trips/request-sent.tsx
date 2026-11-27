import Link from "next/link";
import { Card } from "@/components/ui/card";

/** Statuses in which the request waits for the operator's answer. */
const AWAITING_OPERATOR: ReadonlySet<string> = new Set([
  "REQUESTED",
  "OPERATOR_PENDING",
]);

export function isAwaitingOperator(status: string): boolean {
  return AWAITING_OPERATOR.has(status);
}

const STEPS = [
  "The operator reviews your request.",
  "You get a confirmed price.",
  "You pay.",
  "Your trip is confirmed.",
];

/**
 * What a request is, and what happens next (rule 2: a request is not a
 * confirmation and nothing is charged). `sent` is the first arrival after
 * sending; afterwards the same panel stays while the operator has not
 * answered. No response time is promised: none is documented.
 */
export function RequestSent({
  status,
  sent,
}: {
  status: string;
  sent: boolean;
}) {
  if (!isAwaitingOperator(status)) return null;
  return (
    <Card
      className="flex flex-col gap-3"
      aria-labelledby="request-sent-heading"
      role="region"
    >
      <h2 id="request-sent-heading" className="text-title">
        {sent ? "Your request has been sent" : "Waiting for the operator"}
      </h2>
      <p className="text-body-sm">
        Nothing is booked or charged yet. This is a request, not a confirmation.
      </p>
      <ol className="list-decimal pl-5 text-body-sm text-muted">
        {STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="text-body-sm text-muted">
        We&apos;ll notify you as soon as the operator responds. You will see it
        in your{" "}
        <Link
          href="/account/notifications"
          className="text-accent hover:underline"
        >
          notifications
        </Link>{" "}
        and on this page.
      </p>
    </Card>
  );
}
