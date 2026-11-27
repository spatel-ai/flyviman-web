import { LockedState } from "@/components/shared/locked-state";

/**
 * For operator staff, and for an organisation that is not approved: the
 * missions are for an approved operator's administrators only (the API
 * decides; this keeps the screen from asking).
 */
export function MissionsNotAvailable({ staff }: { staff: boolean }) {
  return (
    <LockedState
      title="Air ambulance"
      heading={staff ? "For your administrator" : "Available once approved"}
      reason={
        staff
          ? "Air ambulance missions hold medical details, so only your organisation's administrator sees them."
          : "Air ambulance missions are shown to administrators of an approved operator."
      }
      next={
        staff
          ? { href: "/operator", label: "Back to dashboard" }
          : { href: "/operator/onboarding", label: "Company and documents" }
      }
    />
  );
}
