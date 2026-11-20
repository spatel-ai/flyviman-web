import { Suspense } from "react";
import Link from "next/link";
import { EnquiryLink } from "@/components/marketing/enquiry-link";
import { CONCEPT_ICONS } from "@/components/marketing/concept-icons";
import { CheckMark, IconBadge } from "@/components/marketing/icon-badge";
import { PageHero } from "@/components/marketing/page-hero";
import { ReadMore } from "@/components/marketing/read-more";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { HOME, type FaqItem } from "@/content/home";
import { SERVICES_PAGE, type Service } from "@/content/services";
import { buttonClasses } from "@/components/ui/button-classes";
import { getPublicContent } from "@/lib/public-content";
import { cn } from "@/lib/utils";

/** In-page index, so a visitor can jump to one service. */
function Index({ services }: { services: readonly Service[] }) {
  return (
    <nav
      aria-label="Services on this page"
      className="mx-auto max-w-wide px-4 pt-12 md:px-6 lg:px-8"
    >
      <ul className="flex flex-wrap gap-2">
        {services.map((service) => {
          const Icon = CONCEPT_ICONS[service.icon];
          return (
            <li key={service.id}>
              <a
                href={`#${service.id}`}
                className="flex min-h-11 items-center gap-2 rounded-pill bg-surface px-4 text-body-sm font-medium transition-colors duration-150 ease-standard hover:bg-border/60"
              >
                <Icon
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="size-5 text-accent"
                />
                {service.title}
              </a>
            </li>
          );
        })}
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
        <IconBadge icon={service.icon} className="mb-5" />
        <SectionHeading id={headingId} overline={service.title}>
          {service.tagline}
        </SectionHeading>
        <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="space-y-5 lg:col-span-7">
            <Reveal>
              <ReadMore paragraphs={service.paragraphs} />
            </Reveal>
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
                      <CheckMark />
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
            <ReadMore
              paragraphs={service.detail}
              textClassName="text-body text-muted"
            />
            <aside
              aria-label={service.insights.title}
              className={cn(
                "max-w-reading rounded-xl p-6",
                band ? "bg-surface-raised" : "bg-surface",
              )}
            >
              <IconBadge icon="insight" />
              <p className="mt-4 text-overline text-muted">Insights</p>
              <h4 className="mt-3 text-title">{service.insights.title}</h4>
              <p className="mt-2 text-body-sm text-muted">
                {service.insights.lead}
              </p>
              <p className="mt-2 text-body-sm text-muted">
                {service.insights.text}
              </p>
            </aside>
            {service.notice ? (
              <p className="flex max-w-reading items-start gap-3 text-body-sm font-medium text-foreground">
                <IconBadge icon="ambulance" className="size-8" />
                <span className="pt-1">{service.notice}</span>
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

/** One question, a native disclosure; one is open at a time (the shared `name`). */
function FaqRow({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  return (
    <details name="services-faq" className="faq group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 py-5 [&::-webkit-details-marker]:hidden">
        <h3 className="text-title">{question}</h3>
        <span
          aria-hidden="true"
          className="faq__mark relative size-4 shrink-0 text-muted"
        />
      </summary>
      <div className="faq__answer max-w-reading pb-6 text-body text-muted">
        {children}
      </div>
    </details>
  );
}

/** Questions the content team published, after the ones written here. */
async function ManagedFaqRows() {
  const items = await getPublicContent("faqs");
  return items.map((item) => (
    <FaqRow key={item.id} question={item.title}>
      <p className="whitespace-pre-line">{item.body}</p>
    </FaqRow>
  ));
}

/**
 * Questions and answers, moved here from the home page. Native disclosure
 * elements, so the answers are in the page for search engines and open
 * without JavaScript; one is open at a time (the shared `name`).
 */
function Faq() {
  const { overline, heading } = HOME.faq;
  const items: readonly FaqItem[] = HOME.faq.items;
  return (
    <section aria-labelledby="faq-heading" className="bg-surface">
      <div className="mx-auto grid max-w-wide gap-8 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-12 lg:gap-12 lg:px-8">
        <div className="lg:col-span-4">
          <SectionHeading id="faq-heading" overline={overline}>
            {heading}
          </SectionHeading>
        </div>
        <Reveal className="lg:col-span-8">
          <div className="divide-y divide-border/60 border-y border-border/60">
            {items.map((item) => (
              <FaqRow key={item.question} question={item.question}>
                <p>{item.answer}</p>
                {item.points ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5">
                    {item.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                ) : null}
                {item.closing ? <p className="mt-3">{item.closing}</p> : null}
              </FaqRow>
            ))}
            <Suspense fallback={null}>
              <ManagedFaqRows />
            </Suspense>
          </div>
        </Reveal>
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
      <section
        aria-labelledby="more-solutions"
        className="mx-auto max-w-wide px-4 py-16 md:px-6 md:py-24 lg:px-8"
      >
        <h2 id="more-solutions" className="text-h2">
          Permits, setup, pilots and more
        </h2>
        <p className="mt-4 max-w-reading text-body-lg text-muted">
          Charter permits, FTO and MRO setup, pilot jobs and training, spares,
          business plans and meet and greet.
        </p>
        <Link
          href="/aviation-solutions"
          className={buttonClasses({
            variant: "ghost",
            className: "mt-6 -ml-5",
          })}
        >
          See all aviation solutions
        </Link>
      </section>
      <Faq />
    </>
  );
}
