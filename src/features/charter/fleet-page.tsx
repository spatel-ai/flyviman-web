import { EnquiryLink } from "@/components/marketing/enquiry-link";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { FLEET } from "@/content/fleet";

/**
 * The aircraft types available for charter. Each leads to an enquiry:
 * these are types operators fly, not bookable aircraft (rule 4).
 */
export function FleetPage() {
  const { hero, note, action, groups } = FLEET;
  return (
    <>
      <PageHero {...hero} />
      {groups.map((group, index) => (
        <section
          key={group.id}
          aria-labelledby={`fleet-${group.id}`}
          className={index % 2 === 1 ? "bg-surface" : undefined}
        >
          <div className="mx-auto max-w-wide px-4 py-16 md:px-6 md:py-24 lg:px-8">
            <SectionHeading id={`fleet-${group.id}`}>
              {group.title}
            </SectionHeading>
            {index === 0 ? (
              <p className="mt-5 max-w-reading text-body-lg text-muted">
                {note}
              </p>
            ) : null}
            <ul className="mt-10 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
              {group.aircraft.map((name, position) => (
                <li key={name}>
                  <Reveal index={position % 3}>
                    <div className="flex min-h-16 items-center justify-between gap-4 border-b border-border/60 py-4">
                      <h3 className="text-title">{name}</h3>
                      <EnquiryLink
                        topic={group.topic}
                        label={`${action}: ${name}`}
                      >
                        Enquire
                      </EnquiryLink>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </>
  );
}
