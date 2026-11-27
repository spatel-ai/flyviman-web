import type { Metadata } from "next";
import { OperatorSettlementsList } from "@/features/operator-settlements/settlements-list";
import { operatorGate } from "@/features/restrictions/operator-gates";
import type { Schemas } from "@/lib/api/types";
import { serverGet } from "@/lib/auth/server-api";

export const metadata: Metadata = { title: "Settlements" };

export default async function OperatorSettlementsPage() {
  const { data: operator } =
    await serverGet<Schemas["OperatorMeResponseDto"]>("operator/me");
  const locked = operatorGate(operator, "Settlements", { adminOnly: true });
  if (locked) return locked;
  return (
    <>
      <h1 className="text-h2">Settlements</h1>
      <p className="mt-2 max-w-prose text-muted">
        What Flyviman owes you for each completed trip: the money kept from the
        customer, less Flyviman&apos;s commission and the tax it collected. A
        refund to the customer after the trip comes out of your payable. Payouts
        are made by bank transfer; the reference shows once paid.
      </p>
      <OperatorSettlementsList />
    </>
  );
}
