import Link from "next/link";
import { EnquiryLink } from "@/components/marketing/enquiry-link";
import { Magnetic } from "@/components/motion/magnetic";
import { Reveal } from "@/components/motion/reveal";
import type { SaleListing } from "@/content/aircraft-sales";

/** One aircraft for sale: its details and specification, and one action. */
export function SaleListingPage({ listing }: { listing: SaleListing }) {
  return (
    <article className="mx-auto max-w-wide px-4 py-12 md:px-6 md:py-20 lg:px-8">
      <Link
        href="/aircraft-sales"
        className="text-body-sm text-accent hover:underline"
      >
        ← Aircraft for sale
      </Link>
      <header className="mt-6 grid gap-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="text-overline text-muted uppercase">
            {listing.category === "AIRCRAFT" ? "Aircraft" : "Helicopter"} for
            sale
          </p>
          <h1 className="mt-3 text-h1 md:text-display">{listing.title}</h1>
        </div>
        <div className="lg:col-span-5 lg:text-right">
          <Magnetic>
            <EnquiryLink topic="AIRCRAFT_SALES" variant="primary">
              Enquire now
            </EnquiryLink>
          </Magnetic>
        </div>
      </header>

      {listing.details.length ? (
        <dl className="mt-12 grid gap-x-8 rounded-xl bg-surface p-6 sm:grid-cols-2 lg:grid-cols-3 md:p-8">
          {listing.details.map((item) => (
            <div
              key={item.label}
              className="flex justify-between gap-4 border-b border-border/60 py-3"
            >
              <dt className="text-body-sm text-muted">{item.label}</dt>
              <dd className="text-right text-body-sm font-medium">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-12 grid gap-10 md:grid-cols-2">
        {listing.sections.map((section, index) => (
          <Reveal key={section.title} index={index % 2}>
            <section aria-label={section.title}>
              <h2 className="text-h3">{section.title}</h2>
              <ul className="mt-4 space-y-2">
                {section.items.map((item, position) => (
                  <li
                    key={`${position}-${item}`}
                    className="text-body-sm text-muted"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        ))}
      </div>
    </article>
  );
}
