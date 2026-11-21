import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/page-transition";
import { AccountOverview } from "@/features/account/overview";

export const metadata: Metadata = { title: "Overview" };

export default function Page() {
  return (
    <PageTransition>
      <h1 className="mb-6 text-h3">Overview</h1>
      <AccountOverview />
    </PageTransition>
  );
}
