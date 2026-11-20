import type { Metadata } from "next";
import { MissionsList } from "@/features/operator-air-ambulance/missions-list";
import { MissionsNotAvailable } from "@/features/operator-air-ambulance/not-available";
import type { Schemas } from "@/lib/api/types";
import { serverGet } from "@/lib/auth/server-api";

export const metadata: Metadata = { title: "Air ambulance" };

export default async function OperatorAirAmbulancePage() {
  const { data: operator } =
    await serverGet<Schemas["OperatorMeResponseDto"]>("operator/me");
  if (
    operator.access.role !== "OPERATOR_ADMIN" ||
    operator.status !== "APPROVED"
  ) {
    return (
      <MissionsNotAvailable staff={operator.access.role !== "OPERATOR_ADMIN"} />
    );
  }
  return (
    <>
      <h1 className="text-h2">Air ambulance</h1>
      <p className="mt-2 max-w-reading text-muted">
        Missions Flyviman operations selected you for, once the customer has
        accepted the quote. Medical details are confidential: every view is
        recorded.
      </p>
      <MissionsList />
    </>
  );
}
