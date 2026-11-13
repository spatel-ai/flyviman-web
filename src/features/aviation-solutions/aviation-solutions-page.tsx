import { EnquiryLink } from "@/components/marketing/enquiry-link";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Magnetic } from "@/components/motion/magnetic";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { AVIATION_SOLUTIONS } from "@/content/aviation-solutions";

/** Everything Flyviman can arrange, grouped, with one way to ask. */
export function AviationSolutionsPage() {
  const { hero, statement, heading, groups, closing } = AVIATION_SOLUTIONS;
  return (
    <>
      <PageHero {...hero} />
      <section
        aria-label="Our approach"
        className="mx-auto max-w-wide px-4 py-16 md:px-6 md:py-24 lg:px-8"
      >
        <Reveal>
          <p className="max-w-content text-h2">{statement}</p>
        </Reveal>
      </section>
      <section aria-labelledby="solutions-heading" className="bg-surface">
        <div className="mx-auto max-w-wide px-4 py-16 md:px-6 md:py-24 lg:px-8">
          <SectionHeading id="solutions-heading">{heading}</SectionHeading>
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {groups.map((group, index) => (
              <li key={group.title}>
                <Reveal index={index % 2} className="h-full">
                  <TiltCard className="h-full rounded-xl bg-surface-raised p-8">
                    <h3 className="text-title">{group.title}</h3>
                    <ul className="mt-5 space-y-3">
                      {group.items.map((item) => (
                        <li
                          key={item}
                          className="flex gap-3 text-body text-muted"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent"
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </TiltCard>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section
        aria-labelledby="solutions-closing"
        className="mx-auto max-w-wide px-4 py-16 text-center md:px-6 md:py-24 lg:px-8"
      >
        <h2 id="solutions-closing" className="text-h2">
          {closing.heading}
        </h2>
        <Magnetic className="mt-8">
          <EnquiryLink topic="CONSULTANCY" variant="primary">
            {closing.action}
          </EnquiryLink>
        </Magnetic>
      </section>
    </>
  );
}
