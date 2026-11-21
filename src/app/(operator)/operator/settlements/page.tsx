import type { Metadata } from "next";
import { OperatorSettlementsList } from "@/features/operator-settlements/settlements-list";
import { AdministratorOnly } from "@/features/operator-staff/administrator-only";
import type { Schemas } from "@/lib/api/types";
import { serverGet } from "@/lib/auth/server-api";

export const metadata: Metadata = { title: "Settlements" };

export default async function OperatorSettlementsPage() {
  const { data: operator } =
    await serverGet<Schemas["OperatorMeResponseDto"]>("operator/me");
  if (operator.access.role !== "OPERATOR_ADMIN") {
    return <AdministratorOnly title="Settlements" />;
  }
  return (
    <>
      <h1 className="text-h2">Settlements</h1>
      <p className="mt-2 max-w-prose text-muted">
        What Flyviman owes you for each completed trip, and the bank reference
        once it is paid. Payouts are made by bank transfer.
      </p>
      <OperatorSettlementsList />
    </>
  );
}
