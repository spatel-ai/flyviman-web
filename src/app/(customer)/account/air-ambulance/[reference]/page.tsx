import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageTransition } from "@/components/motion/page-transition";
import { EmergencyNotice } from "@/components/shared/air-ambulance/emergency-notice";
import { RequestDetail } from "@/features/air-ambulance/request-detail";
import { isAirAmbulanceReference } from "@/lib/air-ambulance/labels";

export const metadata: Metadata = {
  title: "Air ambulance request",
  robots: { index: false },
};

export default async function Page({
  params,
  searchParams,
}: PageProps<"/account/air-ambulance/[reference]">) {
  const { reference } = await params;
  // Only a well-formed reference may reach the API path built from it.
  if (!isAirAmbulanceReference(reference)) notFound();
  const query = await searchParams;
  const notice =
    query.documents === "incomplete"
      ? "documents"
      : query.sent === "1"
        ? "sent"
        : null;
  return (
    <>
      <EmergencyNotice className="mb-8" />
      <PageTransition>
        <RequestDetail reference={reference} notice={notice} />
      </PageTransition>
    </>
  );
}
