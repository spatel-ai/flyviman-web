import { ClientRedirect } from "@/components/shared/client-redirect";
import { Card } from "@/components/ui/card";
import type { Schemas } from "@/lib/api/types";
import { serverGet } from "@/lib/auth/server-api";

export default async function OperatorDashboardPage() {
  const { data: operator } =
    await serverGet<Schemas["OperatorProfileResponseDto"]>("operator/profile");
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
      <Card variant="raised" className="mt-6">
        <h2 className="text-title">Nothing to show yet</h2>
        <p className="mt-2 text-muted">
          Your aircraft, booking requests and upcoming trips will appear here.
        </p>
      </Card>
    </>
  );
}
