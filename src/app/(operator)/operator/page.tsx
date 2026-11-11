import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import type { Schemas } from "@/lib/api/types";
import { serverGet } from "@/lib/auth/server-api";

export default async function OperatorDashboardPage() {
  const { data: operator } =
    await serverGet<Schemas["OperatorProfileResponseDto"]>("operator/profile");
  // The dashboard opens once the organisation is approved.
  if (operator.status !== "APPROVED") redirect("/operator/onboarding");

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
