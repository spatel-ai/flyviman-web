import Link from "next/link";
import { EnquiryLink } from "@/components/marketing/enquiry-link";
import { buttonClasses } from "@/components/ui/button-classes";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { CHARTER } from "@/content/charter";

/** Route-arc motif, the site's one illustration. */
function Arc() {
  return (
    <svg viewBox="0 0 400 120" aria-hidden="true" className="w-full">
      <path
        d="M20 110 Q200 -40 380 110"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="stroke-border"
      />
      <circle cx="20" cy="110" r="4" className="fill-border" />
      <circle cx="380" cy="110" r="4" className="fill-border" />
    </svg>
  );
}

/**
 * The eight kinds of charter, each leading to an enquiry. Nothing here is
 * bookable: a charter is a request until an operator accepts it.
 */
export function CharterPage() {
  const { hero, heading, note, action, kinds } = CHARTER;
  return (
    <>
      <PageHero {...hero} />
      <section
        aria-labelledby="charter-kinds-heading"
        className="mx-auto max-w-wide px-4 py-16 md:px-6 md:py-24 lg:px-8"
      >
        <SectionHeading id="charter-kinds-heading">{heading}</SectionHeading>
        <p className="mt-5 max-w-reading text-body-lg text-muted">{note}</p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kinds.map((kind, position) => {
            const body = (
              <div className="flex h-full flex-col gap-8 rounded-xl bg-surface p-6">
                <Arc />
                <div className="mt-auto">
                  <h3 className="text-title">{kind.name}</h3>
                  {kind.notice ? (
                    <p className="mt-2 text-body-sm font-medium text-foreground">
                      {kind.notice}
                    </p>
                  ) : null}
                  <div className="mt-5">
                    <EnquiryLink
                      topic={kind.topic}
                      label={`${action}: ${kind.name.toLowerCase()}`}
                    >
                      {action}
                    </EnquiryLink>
                  </div>
                </div>
              </div>
            );
            return (
              <li key={kind.name}>
                {/* A card with a safety notice is never animated (rule 7). */}
                {kind.notice ? (
                  body
                ) : (
                  <Reveal index={position % 4} className="h-full">
                    <TiltCard className="h-full">{body}</TiltCard>
                  </Reveal>
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-10">
          <Link
            href="/charter/fleet"
            className={buttonClasses({ variant: "ghost", className: "-ml-5" })}
          >
            See the charter fleet
          </Link>
        </div>
      </section>
    </>
  );
}
