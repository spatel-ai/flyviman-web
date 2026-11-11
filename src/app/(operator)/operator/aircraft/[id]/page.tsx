import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AircraftEditor } from "@/features/operator-aircraft/aircraft-editor";
import { isUuid } from "@/lib/utils";

export const metadata: Metadata = { title: "Aircraft" };

export default async function OperatorAircraftDetailPage({
  params,
}: PageProps<"/operator/aircraft/[id]">) {
  const { id } = await params;
  // Only a UUID may reach the API path built from this id.
  if (!isUuid(id)) notFound();
  return <AircraftEditor id={id} />;
}
