import Image from "next/image";
import Link from "next/link";
import { EnquiryLink } from "@/components/marketing/enquiry-link";
import { buttonClasses } from "@/components/ui/button-classes";
import { IconBadge } from "@/components/marketing/icon-badge";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { CHARTER } from "@/content/charter";
import { IMAGES } from "@/content/image-credits";

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
              <div className="flex h-full flex-col overflow-hidden rounded-xl bg-surface">
                {/* Interim stock photograph, atmosphere only: the name below says what the card is. */}
                <div className="relative aspect-3/2 w-full">
                  <Image
                    src={IMAGES[kind.image].src}
                    alt=""
                    fill
                    placeholder="blur"
                    sizes="(min-width: 1200px) 280px, (min-width: 640px) 45vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-4 p-6">
                  <IconBadge icon={kind.icon} />
                  <div className="mt-auto">
                    <h3 className="text-title">{kind.name}</h3>
                    {kind.notice ? (
                      <p className="mt-2 text-body-sm font-medium text-foreground">
                        {kind.notice}
                      </p>
                    ) : null}
                    <div className="-ml-5 mt-5">
                      <EnquiryLink
                        topic={kind.topic}
                        label={`${action}: ${kind.name.toLowerCase()}`}
                      >
                        {action}
                      </EnquiryLink>
                    </div>
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
