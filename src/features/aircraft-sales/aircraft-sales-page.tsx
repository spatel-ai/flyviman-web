import Link from "next/link";
import { EnquiryLink } from "@/components/marketing/enquiry-link";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { AIRCRAFT_SALES } from "@/content/aircraft-sales";

function detail(
  listing: (typeof AIRCRAFT_SALES.listings)[number],
  label: string,
) {
  return listing.details.find((d) => d.label === label)?.value;
}

/** Jets and helicopters for sale, each with its own page or an enquiry. */
export function AircraftSalesPage() {
  const { hero, categories, listings, action } = AIRCRAFT_SALES;
  return (
    <>
      <PageHero {...hero} />
      {categories.map((category, index) => (
        <section
          key={category.id}
          aria-labelledby={`sales-${category.id}`}
          className={index % 2 === 1 ? "bg-surface" : undefined}
        >
          <div className="mx-auto max-w-wide px-4 py-16 md:px-6 md:py-24 lg:px-8">
            <SectionHeading id={`sales-${category.id}`}>
              {category.title}
            </SectionHeading>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings
                .filter((listing) => listing.category === category.id)
                .map((listing, position) => {
                  const facts = [
                    detail(listing, "Location"),
                    detail(listing, "Total Time"),
                  ].filter(Boolean);
                  return (
                    <li key={listing.title}>
                      <Reveal index={position % 3} className="h-full">
                        <TiltCard
                          className={`flex h-full flex-col rounded-xl p-6 ${index % 2 === 1 ? "bg-surface-raised" : "bg-surface"}`}
                        >
                          <h3 className="text-title">{listing.title}</h3>
                          {listing.serial ? (
                            <p className="mt-1 text-body-sm text-muted">
                              SN {listing.serial}
                            </p>
                          ) : null}
                          {facts.length ? (
                            <p className="mt-3 text-body-sm text-muted">
                              {facts.join(" · ")}
                            </p>
                          ) : null}
                          <div className="mt-auto flex flex-wrap gap-2 pt-6">
                            {listing.slug ? (
                              <Link
                                href={`/aircraft-sales/${listing.slug}`}
                                className="inline-flex h-11 items-center rounded-pill px-5 text-body font-medium text-accent transition-colors duration-150 ease-standard hover:bg-accent/10"
                                aria-label={`Details of the ${listing.title}`}
                              >
                                Details
                              </Link>
                            ) : null}
                            <EnquiryLink
                              topic="AIRCRAFT_SALES"
                              label={`${action}: ${listing.title}`}
                            >
                              {action}
                            </EnquiryLink>
                          </div>
                        </TiltCard>
                      </Reveal>
                    </li>
                  );
                })}
            </ul>
          </div>
        </section>
      ))}
    </>
  );
}
