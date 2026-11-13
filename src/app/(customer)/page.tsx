import { About } from "@/features/home/about";
import { CategoryTiles } from "@/features/home/category-tiles";
import { Faq } from "@/features/home/faq";
import { Hero } from "@/features/home/hero";
import { LuxuryCharter } from "@/features/home/luxury-charter";
import { Services } from "@/features/home/services";
import { PageTransition } from "@/components/motion/page-transition";

export default function HomePage() {
  return (
    <PageTransition>
      <Hero />
      <About />
      <CategoryTiles />
      <Services />
      <LuxuryCharter />
      <Faq />
    </PageTransition>
  );
}
