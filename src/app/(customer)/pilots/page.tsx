import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/page-transition";
import { PilotsPage } from "@/features/pilots/pilots-page";

export const metadata: Metadata = {
  title: "Pilots",
  description:
    "Pilot job assistance, pilot courses and regulatory trainings from FlyViman.",
};

export default function Page() {
  return (
    <PageTransition>
      <PilotsPage />
    </PageTransition>
  );
}
