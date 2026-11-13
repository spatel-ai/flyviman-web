import { EnquiryLink } from "@/components/marketing/enquiry-link";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { SERVICES_PAGE, type Service } from "@/content/services";
import { cn } from "@/lib/utils";

/** In-page index, so a visitor can jump to one service. */
function Index({ services }: { services: readonly Service[] }) {
  return (
    <nav
      aria-label="Services on this page"
      className="mx-auto max-w-wide px-4 pt-12 md:px-6 lg:px-8"
    >
      <ul className="flex flex-wrap gap-2">
        {services.map((service) => (
          <li key={service.id}>
            <a
              href={`#${service.id}`}
              className="flex min-h-11 items-center rounded-pill bg-surface px-4 text-body-sm font-medium transition-colors duration-150 ease-standard hover:bg-border/60"
            >
              {service.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ServiceSection({
  service,
  band,
}: {
  service: Service;
  band: boolean;
}) {
  const headingId = `${service.id}-heading`;
  return (
    <section
      id={service.id}
      aria-labelledby={headingId}
      className={cn("scroll-mt-16", band && "bg-surface")}
    >
      <div className="mx-auto max-w-wide px-4 py-16 md:px-6 md:py-24 lg:px-8">
        <SectionHeading id={headingId} overline={service.title}>
          {service.tagline}
        </SectionHeading>
        <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="space-y-5 lg:col-span-7">
            {service.paragraphs.map((paragraph, index) => (
              <Reveal key={paragraph} index={index}>
                <p className="max-w-reading text-body-lg text-muted">
                  {paragraph}
                </p>
              </Reveal>
            ))}
            <Reveal>
              <blockquote className="max-w-reading border-l-2 border-accent pl-5 text-h3">
                “{service.quote}”
              </blockquote>
            </Reveal>
          </div>
          <div className="lg:col-span-5">
            <Reveal>
              <TiltCard
                className={cn(
                  "rounded-xl p-6 md:p-8",
                  band ? "bg-surface-raised" : "bg-surface",
                )}
              >
                <h3 className="text-title">{service.listTitle}</h3>
                <ul className="mt-4 space-y-3">
                  {service.points.map((point) => (
                    <li key={point} className="flex gap-3 text-body">
                      <span
                        aria-hidden="true"
                        className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent"
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </TiltCard>
            </Reveal>
          </div>
        </div>
        <div className="mt-12 grid gap-8 border-t border-border/60 pt-10 lg:grid-cols-12 lg:gap-12">
          <h3 className="text-h3 lg:col-span-5">{service.detailTitle}</h3>
          <div className="space-y-4 lg:col-span-7">
            {service.detail.map((paragraph) => (
              <p key={paragraph} className="max-w-reading text-body text-muted">
                {paragraph}
              </p>
            ))}
            {service.notice ? (
              <p className="max-w-reading text-body-sm font-medium text-foreground">
                {service.notice}
              </p>
            ) : null}
            <div className="pt-2">
              <EnquiryLink
                topic={service.topic}
                label={`Enquire about ${service.title.toLowerCase()}`}
              >
                Enquire
              </EnquiryLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The five services, each with its promise, its list and how it works. */
export function ServicesPage() {
  const { hero, services } = SERVICES_PAGE;
  return (
    <>
      <PageHero {...hero} />
      <Index services={services} />
      {services.map((service, index) => (
        <ServiceSection
          key={service.id}
          service={service}
          band={index % 2 === 0}
        />
      ))}
    </>
  );
}
