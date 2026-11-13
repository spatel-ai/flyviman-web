import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/page-transition";
import { AircraftSalesPage } from "@/features/aircraft-sales/aircraft-sales-page";

export const metadata: Metadata = {
  title: "Aircraft for sale",
  description: "Business jets and helicopters for sale through FlyViman.",
};

export default function Page() {
  return (
    <PageTransition>
      <AircraftSalesPage />
    </PageTransition>
  );
}
