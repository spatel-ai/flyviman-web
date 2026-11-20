import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/page-transition";
import { TripsList } from "@/features/trips/trips-list";

export const metadata: Metadata = { title: "Your trips" };

export default function Page() {
  return (
    <PageTransition>
      <h1 className="mb-6 text-h3">Your trips</h1>
      <TripsList />
    </PageTransition>
  );
}
