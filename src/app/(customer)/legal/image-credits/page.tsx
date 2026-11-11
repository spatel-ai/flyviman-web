import type { Metadata } from "next";
import { ImageCreditsList } from "@/features/legal/image-credits-list";
import { PageTransition } from "@/components/motion/page-transition";

export const metadata: Metadata = { title: "Image credits" };

export default function ImageCreditsPage() {
  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-content px-4 py-12 md:px-6 md:py-16">
        <h1 className="text-h1">Image credits</h1>
        <p className="mt-4 max-w-reading text-body-lg text-muted">
          The photographs on this site set the scene. They do not show the
          aircraft you would fly on: each operator&apos;s own photographs appear
          with their aircraft.
        </p>
        <ImageCreditsList />
      </div>
    </PageTransition>
  );
}
