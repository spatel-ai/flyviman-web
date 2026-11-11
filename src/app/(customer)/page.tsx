import { CategoryTiles } from "@/features/home/category-tiles";
import { Hero } from "@/features/home/hero";
import { HowItWorks } from "@/features/home/how-it-works";
import { TrustStrip } from "@/features/home/trust-strip";
import { PageTransition } from "@/components/motion/page-transition";

export default function HomePage() {
  return (
    <PageTransition>
      <Hero />
      <CategoryTiles />
      <HowItWorks />
      <TrustStrip />
    </PageTransition>
  );
}
