import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/page-transition";
import { EmergencyNotice } from "@/components/shared/air-ambulance/emergency-notice";
import { RequestsList } from "@/features/air-ambulance/requests-list";

export const metadata: Metadata = { title: "Air ambulance requests" };

export default function Page() {
  return (
    <>
      <EmergencyNotice className="mb-8" />
      <PageTransition>
        <h1 className="mb-6 text-h3">Air ambulance requests</h1>
        <RequestsList />
      </PageTransition>
    </>
  );
}
