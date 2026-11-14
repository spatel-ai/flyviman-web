import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalculationDetail } from "@/features/admin-pricing/calculation-detail";
import { isUuid } from "@/lib/utils";

export const metadata: Metadata = { title: "Price calculation" };

export default async function AdminPriceCalculationPage({
  params,
}: PageProps<"/admin/pricing/calculations/[id]">) {
  const { id } = await params;
  // Only a UUID may reach the API path built from this id.
  if (!isUuid(id)) notFound();
  return <CalculationDetail id={id} />;
}
