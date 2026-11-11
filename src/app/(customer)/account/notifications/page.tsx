import type { Metadata } from "next";
import { Notifications } from "@/features/account/notifications";
import { PageTransition } from "@/components/motion/page-transition";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return (
    <PageTransition>
      <h1 className="mb-6 text-h3">Notifications</h1>
      <Notifications />
    </PageTransition>
  );
}
