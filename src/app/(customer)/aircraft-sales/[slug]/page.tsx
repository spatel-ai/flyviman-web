import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageTransition } from "@/components/motion/page-transition";
import { AIRCRAFT_SALES } from "@/content/aircraft-sales";
import { SaleListingPage } from "@/features/aircraft-sales/sale-listing-page";

const listingFor = (slug: string) =>
  AIRCRAFT_SALES.listings.find((listing) => listing.slug === slug);

/** Only listings with a page on the live site have one here; any other
 *  address is not found. */
export function generateStaticParams() {
  return AIRCRAFT_SALES.listings.flatMap((listing) =>
    listing.slug ? [{ slug: listing.slug }] : [],
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/aircraft-sales/[slug]">): Promise<Metadata> {
  const listing = listingFor((await params).slug);
  return listing
    ? {
        title: `${listing.title} for sale`,
        description: `${listing.title}, offered for sale through FlyViman.`,
      }
    : {};
}

export default async function Page({
  params,
}: PageProps<"/aircraft-sales/[slug]">) {
  const listing = listingFor((await params).slug);
  if (!listing) notFound();
  return (
    <PageTransition>
      <SaleListingPage listing={listing} />
    </PageTransition>
  );
}
