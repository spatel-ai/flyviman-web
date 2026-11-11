import type { Metadata } from "next";
import { Passengers } from "@/features/account/passengers";
import { PageTransition } from "@/components/motion/page-transition";

export const metadata: Metadata = { title: "Saved passengers" };

export default function Page() {
  return (
    <PageTransition>
      <h1 className="mb-6 text-h3">Saved passengers</h1>
      <Passengers />
    </PageTransition>
  );
}
