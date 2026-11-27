import { LockedState } from "@/components/shared/locked-state";

/**
 * Shown to operator staff on pages only the organisation's administrator
 * uses, or that need a permission they were not given. The API refuses the
 * same calls.
 */
export function AdministratorOnly({
  title,
  reason = "Your organisation's administrator looks after this. Ask them if something here needs to change.",
}: {
  title?: string;
  reason?: string;
}) {
  return (
    <LockedState
      title={title}
      heading="Managed by your administrator"
      reason={reason}
      next={{ href: "/operator", label: "Back to dashboard" }}
    />
  );
}
