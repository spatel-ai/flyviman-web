import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfferEditor } from "@/features/operator-empty-legs/offer-editor";
import { isUuid } from "@/lib/utils";

export const metadata: Metadata = { title: "Empty leg" };

export default async function OperatorEmptyLegPage({
  params,
}: PageProps<"/operator/empty-legs/[id]">) {
  const { id } = await params;
  // Only a UUID may reach the API path built from this id.
  if (!isUuid(id)) notFound();
  return <OfferEditor id={id} />;
}
