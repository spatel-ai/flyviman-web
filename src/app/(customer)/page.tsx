import { CategoryTiles } from "@/features/home/category-tiles";
import { LandingHero } from "@/features/home/landing-hero";
import { TrustStrip } from "@/features/home/trust-strip";
import { PageTransition } from "@/components/motion/page-transition";

export default function HomePage() {
  return (
    <PageTransition>
      <LandingHero />
      <CategoryTiles />
      <TrustStrip />
    </PageTransition>
  );
}
