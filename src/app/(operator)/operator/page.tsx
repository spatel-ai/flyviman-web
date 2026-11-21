import { ClientRedirect } from "@/components/shared/client-redirect";
import { OperatorDashboard } from "@/features/operator-dashboard/operator-dashboard";
import type { Schemas } from "@/lib/api/types";
import { serverGet } from "@/lib/auth/server-api";

export default async function OperatorDashboardPage() {
  const { data: operator } =
    await serverGet<Schemas["OperatorMeResponseDto"]>("operator/me");
  // The dashboard opens once the organisation is approved. Not redirect():
  // this page streams, and a streamed redirect reloads the destination a
  // moment later, wiping what the operator has started typing there.
  if (operator.status !== "APPROVED") {
    return (
      <ClientRedirect
        href="/operator/onboarding"
        label="Continue to your application"
      />
    );
  }

  return (
    <>
      <h1 className="text-h2">Dashboard</h1>
      <div className="mt-6">
        <OperatorDashboard />
      </div>
    </>
  );
}
