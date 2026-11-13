import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { ScrollScrub } from "@/components/motion/scroll-scrub";
import { buttonClasses } from "@/components/ui/button-classes";
import { IMAGES } from "@/content/image-credits";
import { TiltCard } from "@/components/motion/tilt-card";
import { HOME } from "@/content/home";
import { SectionHeading } from "@/components/marketing/section-heading";

/** The four things the company offers, as cards that lean to the pointer. */
export function Services() {
  const { overline, heading, lead, points, image, action } = HOME.services;
  const photo = IMAGES[image];
  return (
    <section aria-labelledby="services-heading" className="bg-surface">
      <div className="mx-auto max-w-wide px-4 py-16 md:px-6 md:py-24 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-12">
          <div className="lg:col-span-7">
            <SectionHeading id="services-heading" overline={overline}>
              {heading}
            </SectionHeading>
            <p className="mt-5 max-w-reading text-body-lg text-muted">{lead}</p>
            <Link
              href={action.href}
              aria-label="View more services"
              className={buttonClasses({
                variant: "ghost",
                className: "mt-8 -ml-5",
              })}
            >
              {action.label}
            </Link>
          </div>
          <div className="relative aspect-4/3 overflow-hidden rounded-xl lg:col-span-5 lg:aspect-4/5">
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
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {points.map((point, index) => (
            <li key={point.title}>
              <Reveal index={index} className="h-full">
                <TiltCard className="h-full rounded-xl bg-surface-raised p-6">
                  <p className="text-overline text-muted tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-6 text-title">{point.title}</h3>
                  <p className="mt-2 text-body-sm text-muted">
                    {point.description}
                  </p>
                </TiltCard>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
