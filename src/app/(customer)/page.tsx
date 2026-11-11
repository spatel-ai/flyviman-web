import { CategoryTiles } from "@/features/home/category-tiles";
import { Hero } from "@/features/home/hero";
import { HowItWorks } from "@/features/home/how-it-works";
import { TrustStrip } from "@/features/home/trust-strip";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoryTiles />
      <HowItWorks />
      <TrustStrip />
    </>
  );
}
