import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { HOME } from "@/content/home";
import { SectionHeading } from "./section-heading";

/** The four things the company offers, as cards that lean to the pointer. */
export function Services() {
  const { overline, heading, lead, points } = HOME.services;
  return (
    <section aria-labelledby="services-heading" className="bg-surface">
      <div className="mx-auto max-w-wide px-4 py-16 md:px-6 md:py-24 lg:px-8">
        <div className="max-w-content">
          <SectionHeading id="services-heading" overline={overline}>
            {heading}
          </SectionHeading>
          <p className="mt-5 max-w-reading text-body-lg text-muted">{lead}</p>
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
