import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { EmergencyNotice } from "@/components/shared/air-ambulance/emergency-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { AIR_AMBULANCE } from "@/content/air-ambulance";
import { RequestGate } from "@/features/air-ambulance/request-gate";

export const metadata: Metadata = {
  title: "Air ambulance",
  description: AIR_AMBULANCE.intro.text,
};

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-content px-4 py-10 md:px-6 md:py-16">
      {/* First and never animated (rule 7): outside the page transition. */}
      <EmergencyNotice />
      <PageTransition>
        <h1 className="mt-10 text-h2">{AIR_AMBULANCE.intro.title}</h1>
        <p className="mt-3 max-w-reading text-body text-muted">
          {AIR_AMBULANCE.intro.text}
        </p>
        <ol className="mt-6 flex max-w-reading list-decimal flex-col gap-2 pl-5 text-body-sm text-muted">
          {AIR_AMBULANCE.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <div className="mt-10">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <RequestGate />
          </Suspense>
        </div>
      </PageTransition>
    </div>
  );
}
