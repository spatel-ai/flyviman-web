import { Card } from "@/components/ui/card";

/**
 * For operator staff, and for an organisation that is not approved: the
 * missions are for an approved operator's administrators only (the API
 * decides; this keeps the screen from asking).
 */
export function MissionsNotAvailable({ staff }: { staff: boolean }) {
  return (
    <>
      <h1 className="text-h2">Air ambulance</h1>
      <Card variant="raised" className="mt-6">
        <h2 className="text-title">
          {staff ? "For your administrator" : "Available once approved"}
        </h2>
        <p className="mt-2 text-muted">
          {staff
            ? "Air ambulance missions hold medical details, so only your organisation's administrator sees them."
            : "Air ambulance missions are shown to administrators of an approved operator."}
        </p>
      </Card>
    </>
  );
}
