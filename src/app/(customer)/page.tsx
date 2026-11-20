import { Suspense } from "react";
import { CategoryTiles } from "@/features/home/category-tiles";
import { HomeBanner } from "@/features/home/home-banner";
import { Hero } from "@/features/home/hero";
import { TrustStrip } from "@/features/home/trust-strip";
import { PageTransition } from "@/components/motion/page-transition";

export default function HomePage() {
  return (
    <PageTransition>
      <Suspense fallback={null}>
        <HomeBanner />
      </Suspense>
      <Hero />
      <CategoryTiles />
      <TrustStrip />
    </PageTransition>
  );
}
