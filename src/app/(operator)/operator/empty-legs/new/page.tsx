import type { Metadata } from "next";
import { OfferForm } from "@/features/operator-empty-legs/offer-form";
import { operatorGate } from "@/features/restrictions/operator-gates";
import type { Schemas } from "@/lib/api/types";
import { serverGet } from "@/lib/auth/server-api";

export const metadata: Metadata = { title: "Add an empty leg" };

export default async function NewEmptyLegPage() {
  const { data: operator } =
    await serverGet<Schemas["OperatorMeResponseDto"]>("operator/me");
  // Creating an offer needs "manage empty legs" and an approved operator;
  // the API refuses it otherwise.
  const locked = operatorGate(operator, "Add an empty leg", {
    capability: "MANAGE_EMPTY_LEGS",
    status: "approved",
  });
  if (locked) return locked;
  return (
    <>
      <h1 className="text-h2">Add an empty leg</h1>
      <p className="mt-2 mb-6 text-muted">
        Save a draft first. You publish it from the next page.
      </p>
      <OfferForm />
    </>
  );
}
