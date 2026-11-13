import Image from "next/image";
import Link from "next/link";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { ScrollScrub } from "@/components/motion/scroll-scrub";
import { buttonClasses } from "@/components/ui/button";
import { HOME } from "@/content/home";
import { IMAGES } from "@/content/image-credits";

/** Who Flyviman is, in the company's own words. */
export function About() {
  const { overline, heading, paragraphs, image, action } = HOME.about;
  const photo = IMAGES[image];
  return (
    <section
      aria-labelledby="about-heading"
      className="mt-16 bg-surface md:mt-24"
    >
      <div className="mx-auto grid max-w-wide gap-8 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-12 lg:gap-12 lg:px-8">
        <div className="lg:col-span-5">
          <SectionHeading id="about-heading" overline={overline}>
            {heading}
          </SectionHeading>
          <div className="relative mt-8 aspect-4/3 overflow-hidden rounded-xl">
            {/* Settles as it scrolls into view. Starts no larger than its
                frame allows, which clips it. */}
            <ScrollScrub
              start="top bottom"
              end="center center"
              from={{ scale: 1.12 }}
              to={{ scale: 1 }}
              className="absolute inset-0"
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                placeholder="blur"
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            </ScrollScrub>
          </div>
        </div>
        <div className="space-y-5 lg:col-span-7 lg:pt-20">
          {paragraphs.map((paragraph, index) => (
            <Reveal key={paragraph} index={index}>
              <p className="max-w-reading text-body-lg text-muted">
                {paragraph}
              </p>
            </Reveal>
          ))}
          <Link
            href={action.href}
            aria-label="View about Flyviman"
            className={buttonClasses({ variant: "secondary" })}
          >
            {action.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
