import type { Metadata } from "next";
import { AircraftForm } from "@/features/operator-aircraft/aircraft-form";
import { AdministratorOnly } from "@/features/operator-staff/administrator-only";
import type { Schemas } from "@/lib/api/types";
import { serverGet } from "@/lib/auth/server-api";

export const metadata: Metadata = { title: "Add aircraft" };

export default async function NewAircraftPage() {
  const { data: operator } =
    await serverGet<Schemas["OperatorMeResponseDto"]>("operator/me");
  // Only administrators create aircraft (security-rbac.md); the API refuses staff.
  if (operator.access.role !== "OPERATOR_ADMIN") {
    return <AdministratorOnly title="Add an aircraft" />;
  }
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
