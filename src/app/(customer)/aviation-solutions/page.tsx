import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/page-transition";
import { AviationSolutionsPage } from "@/features/aviation-solutions/aviation-solutions-page";

export const metadata: Metadata = {
  title: "Aviation solutions",
  description:
    "Charter, aircraft and helicopter sales and leases, permits, FTO and MRO setup, pilot jobs and training, spares, business plans and meet and greet.",
};

export default function Page() {
  return (
    <PageTransition>
      <AviationSolutionsPage />
    </PageTransition>
  );
}
