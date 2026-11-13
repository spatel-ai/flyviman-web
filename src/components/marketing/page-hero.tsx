import Image from "next/image";
import { ScrollScrub } from "@/components/motion/scroll-scrub";
import { IMAGES, type SiteImageName } from "@/content/image-credits";

/**
 * The opening of a customer marketing page: an eyebrow, the page's one
 * heading, a lead and a wide photograph that drifts slowly. The words lift
 * a little as the hero scrolls away (motion-design.md).
 */
export function PageHero({
  overline,
  title,
  lead,
  image,
}: {
  overline: string;
  title: string;
  lead: string;
  image: SiteImageName;
}) {
  const photo = IMAGES[image];
  return (
    <section className="mx-auto max-w-wide px-4 pt-12 md:px-6 md:pt-20 lg:px-8">
      <ScrollScrub
        trigger="section"
        start="top top"
        end="bottom top"
        from={{ yPercent: 0, opacity: 1 }}
        to={{ yPercent: -12, opacity: 0.6 }}
        className="max-w-content"
      >
        <p className="text-overline text-muted uppercase">{overline}</p>
        <h1 className="mt-3 text-h1 md:text-display">{title}</h1>
        <p className="mt-5 max-w-reading text-body-lg text-muted">{lead}</p>
      </ScrollScrub>
      <div className="relative mt-10 aspect-4/3 overflow-hidden rounded-xl bg-surface md:mt-14 md:aspect-21/9">
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          preload
          placeholder="blur"
          sizes="(min-width: 1200px) 1136px, 100vw"
          className="hero-drift object-cover"
        />
      </div>
    </section>
  );
}
