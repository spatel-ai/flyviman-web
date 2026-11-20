import { EmptyState } from "@/components/shared/empty-state";

/** For operations, decided from the session before anything loads. */
export function FinanceOnly() {
  return (
    <p className="mt-6 max-w-reading text-body text-muted">
      Payments and refunds are managed by finance. Ask a finance administrator
      if something here needs attention.
    </p>
  );
}

/** Until the payment records and refunds routes exist (FINANCE_ROUTES_READY). */
export function NotAvailableYet({ what }: { what: string }) {
  return (
    <EmptyState
      className="mt-6"
      title={`${what} are not available yet`}
      description="They appear here once payment records and refunds are switched on."
    />
  );
}
