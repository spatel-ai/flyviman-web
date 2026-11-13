import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/page-transition";
import { SearchForm } from "@/features/search/search-form";

export const metadata: Metadata = {
  title: "Search aircraft",
  description:
    "Find a private jet, turboprop or helicopter for your trip, with an estimate for each.",
};

export default function Page() {
  return (
    <PageTransition>
      <div className="mx-auto flex w-full max-w-wide flex-col gap-8 px-4 py-12 md:px-6 md:py-16">
        <div className="flex flex-col gap-3">
          <h1 className="text-h1">Search aircraft</h1>
          <p className="max-w-reading text-body-lg text-muted">
            Tell us your trip. We show the aircraft that can fly it, each with
            an estimate. The operator confirms the final price.
          </p>
        </div>
        <SearchForm />
      </div>
    </PageTransition>
  );
}
