import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AircraftReview } from "@/features/admin-aircraft/aircraft-review";
import { isUuid } from "@/lib/utils";

export const metadata: Metadata = { title: "Aircraft review" };

export default async function AdminAircraftDetailPage({
  params,
}: PageProps<"/admin/aircraft/[id]">) {
  const { id } = await params;
  // Only a UUID may reach the API path built from this id.
  if (!isUuid(id)) notFound();
  return <AircraftReview id={id} />;
}
