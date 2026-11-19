import type { Metadata } from "next";
import { OfferForm } from "@/features/operator-empty-legs/offer-form";

export const metadata: Metadata = { title: "Add an empty leg" };

export default function NewEmptyLegPage() {
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
