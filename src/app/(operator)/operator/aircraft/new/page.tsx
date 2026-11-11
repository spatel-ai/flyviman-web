import type { Metadata } from "next";
import { AircraftForm } from "@/features/operator-aircraft/aircraft-form";

export const metadata: Metadata = { title: "Add aircraft" };

export default function NewAircraftPage() {
  return (
    <>
      <h1 className="text-h2">Add an aircraft</h1>
      <p className="mt-2 mb-6 text-muted">
        Start with the profile. Photos and documents are added on the next page,
        before you submit it for review.
      </p>
      <AircraftForm />
    </>
  );
}
