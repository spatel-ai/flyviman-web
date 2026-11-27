import type { Metadata } from "next";
import { OperatorPricingForm } from "@/features/operator-pricing/operator-pricing-form";
import { OperatorRestrictions } from "@/features/restrictions/operator-restrictions";
import { operatorGate } from "@/features/restrictions/operator-gates";
import type { Schemas } from "@/lib/api/types";
import { serverGet } from "@/lib/auth/server-api";

export const metadata: Metadata = { title: "Pricing" };

export default async function OperatorPricingPage() {
  const { data: operator } =
    await serverGet<Schemas["OperatorMeResponseDto"]>("operator/me");
  // Changing rates needs an approved operator; reading stays open once live.
  const locked = operatorGate(operator, "Pricing", {
    adminOnly: true,
    status: "live",
  });
  if (locked) return locked;
  return (
    <>
      <h1 className="text-h2">Pricing</h1>
      <p className="mt-2 max-w-prose text-muted">
        Defaults for every aircraft. Set each aircraft&apos;s hourly rate on its
        page in the fleet. Customers see estimates built from these; you confirm
        the final price on each request.
      </p>
      <OperatorPricingForm />
      <OperatorRestrictions />
    </>
  );
}
