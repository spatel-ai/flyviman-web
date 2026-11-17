import Image from "next/image";
import { SearchWidget } from "@/components/booking/search-widget";
import { HOME } from "@/content/home";

/**
 * The home page hero: a still photograph in a box of fixed height (nothing
 * shifts while it loads), a one-line headline and the charter search card,
 * which overlaps the photograph's lower edge so it sits on the first screen
 * of a phone. The photograph is scenery, so its alt text is empty. Nothing
 * here moves.
 */
export function LandingHero() {
  const headline = HOME.hero.headline.join(" ");
  return (
    <section aria-labelledby="home-hero" className="relative isolate">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-72 overflow-hidden bg-surface md:h-104"
      >
        <Image
          src="/hero/desktop/poster-first.webp"
          alt=""
          fill
          preload
          sizes="100vw"
          className="object-cover object-[35%_50%] md:object-center"
        />
        <div className="absolute inset-0 bg-scrim" />
      </div>
      <div className="mx-auto max-w-wide px-4 pt-5 pb-10 md:px-6 md:pt-16 md:pb-14 lg:px-8">
        <h1
          id="home-hero"
          className="max-w-xl text-h3 text-on-photo sm:text-h2 md:text-h1"
        >
          {headline}
        </h1>
        <div className="mt-4 md:mt-10">
          <SearchWidget initial={{ service: "charter" }} />
        </div>
      </div>
    </section>
  );
}
