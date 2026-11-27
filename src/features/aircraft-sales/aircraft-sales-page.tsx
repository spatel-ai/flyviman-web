import { IconBadge } from "@/components/marketing/icon-badge";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionHeading } from "@/components/marketing/section-heading";
import { AIRCRAFT_SALES } from "@/content/aircraft-sales";
import { ListingGrid } from "./listing-grid";

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
            <IconBadge
              icon={category.id === "HELICOPTER" ? "helicopter" : "plane"}
              className="mb-5"
            />
            <SectionHeading id={`sales-${category.id}`}>
              {category.title}
            </SectionHeading>
            <ListingGrid
              listings={listings.filter(
                (listing) => listing.category === category.id,
              )}
              action={action}
              raised={index % 2 === 1}
            />
          </div>
        </section>
      ))}
    </>
  );
}
