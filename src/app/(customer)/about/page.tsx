import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/page-transition";
import { AboutPage } from "@/features/about/about-page";

export const metadata: Metadata = {
  title: "About us",
  description:
    "FlyViman Aviation: a premium aviation solutions company built on clarity, trust and operational discipline.",
};

export default function Page() {
  return (
    <PageTransition>
      <AboutPage />
    </PageTransition>
  );
}
