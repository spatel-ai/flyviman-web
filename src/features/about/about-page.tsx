import { SectionHeading } from "@/components/marketing/section-heading";
import { PageHero } from "@/components/marketing/page-hero";
import { Magnetic } from "@/components/motion/magnetic";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { buttonClasses } from "@/components/ui/button-classes";
import { ABOUT } from "@/content/about";
import Link from "next/link";

function Prose({ paragraphs }: { paragraphs: readonly string[] }) {
  return (
    <div className="space-y-5">
      {paragraphs.map((paragraph, index) => (
        <Reveal key={paragraph} index={index}>
          <p className="max-w-reading text-body-lg text-muted">{paragraph}</p>
        </Reveal>
      ))}
    </div>
  );
}

/** Who Flyviman is, its vision, its founder's note, its team and its way of working. */
export function AboutPage() {
  const { hero, intro, visionMission, founder, team, philosophy, closing } =
    ABOUT;
  return (
    <>
      <PageHero {...hero} />

      <section
        aria-label="Introduction"
        className="mx-auto max-w-wide px-4 py-16 md:px-6 md:py-24 lg:px-8"
      >
        <div className="lg:ml-auto lg:w-7/12">
          <Prose paragraphs={intro} />
        </div>
      </section>

      <section aria-labelledby="vision-heading" className="bg-surface">
        <div className="mx-auto max-w-wide px-4 py-16 md:px-6 md:py-24 lg:px-8">
          <SectionHeading id="vision-heading" overline={visionMission.overline}>
            {visionMission.heading}
          </SectionHeading>
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {visionMission.items.map((item, index) => (
              <li key={item.title}>
                <Reveal index={index} className="h-full">
                  <TiltCard className="h-full rounded-xl bg-surface-raised p-8">
                    <h3 className="text-overline text-accent uppercase">
                      {item.title}
                    </h3>
                    <p className="mt-4 text-h3">{item.text}</p>
                  </TiltCard>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {[founder, team, philosophy].map((block, index) => (
        <section
          key={block.overline}
          aria-labelledby={`about-${index}-heading`}
          className={index % 2 === 1 ? "bg-surface" : undefined}
        >
          <div className="mx-auto grid max-w-wide gap-8 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-12 lg:gap-12 lg:px-8">
            <div className="lg:col-span-5">
              <SectionHeading
                id={`about-${index}-heading`}
                overline={block.overline}
              >
                {block.heading}
              </SectionHeading>
            </div>
            <div className="lg:col-span-7">
              <Prose paragraphs={block.paragraphs} />
            </div>
          </div>
        </section>
      ))}

      <section aria-labelledby="closing-heading" className="bg-surface">
        <div className="mx-auto max-w-content px-4 py-16 text-center md:px-6 md:py-24 lg:px-8">
          <SectionHeading id="closing-heading">
            {closing.heading}
          </SectionHeading>
          <Reveal>
            <p className="mx-auto mt-5 max-w-reading text-body-lg text-muted">
              {closing.text}
            </p>
          </Reveal>
          <Magnetic className="mt-8">
            <Link href="/contact" className={buttonClasses({ size: "lg" })}>
              Get in touch
            </Link>
          </Magnetic>
        </div>
      </section>
    </>
  );
}
