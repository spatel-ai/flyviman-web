import { About } from "@/features/home/about";
import { CategoryTiles } from "@/features/home/category-tiles";
import { CharterScenes } from "@/features/home/charter-scenes";
import { Faq } from "@/features/home/faq";
import { Hero } from "@/features/home/hero";
import { Services } from "@/features/home/services";
import { PageTransition } from "@/components/motion/page-transition";

export default function HomePage() {
  return (
    <PageTransition>
      <Hero />
      <About />
      <CategoryTiles />
      <Services />
      <CharterScenes />
      <Faq />
    </PageTransition>
  );
}
