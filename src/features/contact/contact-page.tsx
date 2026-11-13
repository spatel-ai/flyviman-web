import { Suspense } from "react";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { CONTACT, CONTACT_PAGE } from "@/content/contact";
import { EnquiryForm } from "./enquiry-form";

const LINK =
  "inline-flex min-h-11 items-center text-foreground underline-offset-4 transition-colors duration-150 ease-standard hover:text-accent hover:underline";

/** Telephone, email, address and hours beside the enquiry form. */
export function ContactPage() {
  const { hero, form } = CONTACT_PAGE;
  return (
    <>
      <PageHero {...hero} />
      <section
        id="enquiry"
        aria-labelledby="enquiry-heading"
        className="mx-auto grid max-w-wide scroll-mt-16 gap-12 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-12 lg:px-8"
      >
        <div className="lg:col-span-7">
          <SectionHeading id="enquiry-heading">{form.heading}</SectionHeading>
          <div className="mt-8">
            {/* Reads the topic from the address. */}
            <Suspense
              fallback={
                <div role="status" aria-label="Loading the form">
                  <Skeleton className="h-96" />
                </div>
              }
            >
              <EnquiryForm />
            </Suspense>
          </div>
        </div>
        <aside
          aria-label="Contact details"
          className="lg:col-span-4 lg:col-start-9"
        >
          <dl className="space-y-8">
            <div>
              <dt className="text-overline text-muted uppercase">Phone</dt>
              {CONTACT.phones.map((phone) => (
                <dd key={phone.href}>
                  <a href={phone.href} className={LINK}>
                    {phone.label}
                  </a>
                </dd>
              ))}
            </div>
            <div>
              <dt className="text-overline text-muted uppercase">Email</dt>
              <dd>
                <a href={`mailto:${CONTACT.email}`} className={LINK}>
                  {CONTACT.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-overline text-muted uppercase">
                {CONTACT.officeLabel}
              </dt>
              <dd className="mt-2 text-body">{CONTACT.address}</dd>
              <dd>
                <a
                  href={CONTACT.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={LINK}
                >
                  Open in Google Maps
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-overline text-muted uppercase">
                Business hours
              </dt>
              {CONTACT.hours.map((row) => (
                <dd
                  key={row.days}
                  className="mt-2 flex justify-between gap-6 text-body"
                >
                  <span>{row.days}</span>
                  <span className="text-muted">{row.time}</span>
                </dd>
              ))}
            </div>
          </dl>
        </aside>
      </section>
    </>
  );
}
