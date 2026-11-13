import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/page-transition";
import { CharterPage } from "@/features/charter/charter-page";

export const metadata: Metadata = {
  title: "Charter",
  description:
    "Private, celebrity, election, marriage, pilgrimage, medical, group and flower drop charters, arranged through certified operators.",
};

export default function Page() {
  return (
    <PageTransition>
      <CharterPage />
    </PageTransition>
  );
}
