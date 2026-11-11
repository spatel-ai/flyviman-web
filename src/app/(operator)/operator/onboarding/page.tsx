import type { Metadata } from "next";
import { OperatorOnboarding } from "@/features/operator-onboarding/operator-onboarding";

export const metadata: Metadata = { title: "Company and documents" };

export default function OperatorOnboardingPage() {
  return <OperatorOnboarding />;
}
