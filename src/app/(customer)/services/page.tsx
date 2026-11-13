import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/page-transition";
import { ServicesPage } from "@/features/services/services-page";

export const metadata: Metadata = {
  title: "Our services",
  description:
    "Aircraft sale and purchase, leasing, charter, consultancy and aviation investment from Flyviman.",
};

export default function Page() {
  return (
    <PageTransition>
      <ServicesPage />
    </PageTransition>
  );
}
