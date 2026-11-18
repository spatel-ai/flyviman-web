import type { Metadata } from "next";
import Link from "next/link";
import { PageTransition } from "@/components/motion/page-transition";
import { CategoryTiles } from "@/features/home-v1/category-tiles";
import { Hero } from "@/features/home-v1/hero";
import { TrustStrip } from "@/features/home-v1/trust-strip";
import "@/features/home-v1/home-v1.css";

export const metadata: Metadata = {
  title: "Previous home page",
  robots: { index: false, follow: false },
};

/**
 * The home page as it was before the redesign, kept for comparison. A frozen
 * copy: it shares nothing with the live home page's hero, card or frames
 * (features/home-v1, components/booking-v1, public/hero-v1). Not linked from
 * the site and not in the sitemap.
 */
export default function HomeV1Page() {
  return (
    <PageTransition>
      <p
        data-testid="compare-note"
        className="border-b border-border px-4 py-2 text-center text-body-sm text-muted"
      >
        Previous design, kept for comparison. The current home page is at{" "}
        <Link href="/" className="text-accent underline underline-offset-2">
          /
        </Link>
        .
      </p>
      <Hero />
      <CategoryTiles />
      <TrustStrip />
    </PageTransition>
  );
}
