"use client";

import Link from "next/link";
import { useState } from "react";
import { EnquiryLink } from "@/components/marketing/enquiry-link";
import { CONCEPT_ICONS } from "@/components/marketing/concept-icons";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { Button } from "@/components/ui/button";
import {
  NOT_STATED,
  nextShown,
  PAGE_SIZE,
  shownValue,
  visibleItems,
} from "./listing-facts";

export interface GridListing {
  slug: string | null;
  title: string;
  serial: string | null;
  details: readonly { label: string; value: string }[];
}

/**
 * One category's cards, twelve at a time. Every card has the same three
 * rows, so listings compare at a glance; a figure the broker did not give
 * reads "Not stated" rather than a zero.
 */
export function ListingGrid({
  listings,
  action,
  raised,
}: {
  listings: readonly GridListing[];
  action: string;
  /** The section behind the cards is already the card colour. */
  raised: boolean;
}) {
  const [shown, setShown] = useState(PAGE_SIZE);
  const visible = visibleItems(listings, shown);
  return (
    <>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((listing, position) => {
          const rows = [
            {
              icon: CONCEPT_ICONS.location,
              label: "Location",
              value: shownValue(listing.details, "Location"),
            },
            {
              icon: CONCEPT_ICONS.hours,
              label: "Total time",
              value: shownValue(listing.details, "Total Time"),
            },
          ];
          const serial =
            listing.serial ?? shownValue(listing.details, "Serial Number");
          return (
            <li key={listing.title}>
              <Reveal index={position % 3} className="h-full">
                <TiltCard
                  className={`flex h-full flex-col rounded-xl p-6 ${raised ? "bg-surface-raised" : "bg-surface"}`}
                >
                  <h3 className="text-title">{listing.title}</h3>
                  <p className="mt-1 text-body-sm text-muted">
                    {serial === NOT_STATED
                      ? `SN: ${NOT_STATED}`
                      : `SN ${serial}`}
                  </p>
                  <dl className="mt-3 space-y-1.5 text-body-sm">
                    {rows.map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-2">
                        <Icon
                          aria-hidden="true"
                          strokeWidth={1.5}
                          className="size-5 shrink-0 text-muted"
                        />
                        <dt className="sr-only">{label}</dt>
                        <dd className="text-muted">
                          {value === NOT_STATED ? `${label}: ${value}` : value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="-ml-5 mt-auto flex flex-wrap gap-2 pt-6">
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
      {visible.length < listings.length ? (
        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="text-body-sm text-muted" aria-live="polite">
            Showing {visible.length} of {listings.length}
          </p>
          <Button
            variant="secondary"
            onClick={() => setShown(nextShown(shown, listings.length))}
          >
            Show more
          </Button>
        </div>
      ) : null}
    </>
  );
}
