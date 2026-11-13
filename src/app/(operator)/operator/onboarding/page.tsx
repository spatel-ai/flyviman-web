import type { Metadata } from "next";
import { OperatorOnboarding } from "@/features/operator-onboarding/operator-onboarding";
import { AdministratorOnly } from "@/features/operator-staff/administrator-only";
import type { Schemas } from "@/lib/api/types";
import { serverGet } from "@/lib/auth/server-api";

export const metadata: Metadata = { title: "Company and documents" };

export default async function OperatorOnboardingPage() {
  const { data: operator } =
    await serverGet<Schemas["OperatorMeResponseDto"]>("operator/me");
  // Staff never edit the company or its documents (D-068); the API refuses.
  if (operator.access.role !== "OPERATOR_ADMIN") {
    return <AdministratorOnly title="Company and documents" />;
  }
  return <OperatorOnboarding />;
}
