import { LockedState } from "@/components/shared/locked-state";

/** For operations, decided from the session before anything loads. */
export function FinanceOnly() {
  return (
    <LockedState
      heading="Managed by finance"
      reason="Payments and refunds are managed by finance. Ask a finance administrator if something here needs attention."
      next={{ href: "/admin", label: "Back to dashboard" }}
    />
  );
}
