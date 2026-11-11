import type { Metadata } from "next";
import { FleetList } from "@/features/operator-aircraft/fleet-list";

export const metadata: Metadata = { title: "Fleet" };

export default function OperatorAircraftPage() {
  return (
    <>
      <h1 className="text-h2">Fleet</h1>
      <p className="mt-2 text-muted">
        Aircraft you offer. A listing is bookable only after operations approve
        it.
      </p>
      <FleetList />
    </>
  );
}
