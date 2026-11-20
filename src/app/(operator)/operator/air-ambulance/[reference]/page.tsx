import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MissionDetail } from "@/features/operator-air-ambulance/mission-detail";
import { MissionsNotAvailable } from "@/features/operator-air-ambulance/not-available";
import { isAirAmbulanceReference } from "@/lib/air-ambulance/labels";
import type { Schemas } from "@/lib/api/types";
import { serverGet } from "@/lib/auth/server-api";

export const metadata: Metadata = { title: "Air ambulance mission" };

export default async function OperatorAirAmbulanceMissionPage({
  params,
}: PageProps<"/operator/air-ambulance/[reference]">) {
  const { reference } = await params;
  // Only a well-formed reference may reach the API path built from it.
  if (!isAirAmbulanceReference(reference)) notFound();
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
  return <MissionDetail reference={reference} />;
}
