import type { Metadata } from "next";
import { AircraftForm } from "@/features/operator-aircraft/aircraft-form";
import { operatorGate } from "@/features/restrictions/operator-gates";
import type { Schemas } from "@/lib/api/types";
import { serverGet } from "@/lib/auth/server-api";

export const metadata: Metadata = { title: "Add aircraft" };

export default async function NewAircraftPage() {
  const { data: operator } =
    await serverGet<Schemas["OperatorMeResponseDto"]>("operator/me");
  // Only administrators of an approved operator create aircraft
  // (security-rbac.md); the API refuses staff and any other status.
  const locked = operatorGate(operator, "Add an aircraft", {
    adminOnly: true,
    status: "approved",
  });
  if (locked) return locked;
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
