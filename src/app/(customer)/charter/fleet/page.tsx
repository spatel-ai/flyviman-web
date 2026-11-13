import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/page-transition";
import { FleetPage } from "@/features/charter/fleet-page";

export const metadata: Metadata = {
  title: "Charter fleet",
  description:
    "Jets, turboprops and helicopters available for charter through FlyViman.",
};

export default function Page() {
  return (
    <PageTransition>
      <FleetPage />
    </PageTransition>
  );
}
