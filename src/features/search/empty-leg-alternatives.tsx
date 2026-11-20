import { OfferCard } from "@/features/empty-legs/offer-card";
import type { EmptyLegOffer } from "@/lib/empty-legs/types";

/**
 * Listed empty legs on, or near, the searched route and dates. Each links to
 * its own page and carries its own labelled price (business rule 1). Nothing
 * is shown when there are none.
 */
export function EmptyLegAlternatives({ offers }: { offers: EmptyLegOffer[] }) {
  if (offers.length === 0) return null;
  return (
    <section
      aria-labelledby="empty-leg-alternatives"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h2 id="empty-leg-alternatives" className="text-title">
          Empty legs on this route
        </h2>
        <p className="text-body-sm text-muted">
          Positioning flights that may cost less, on the same or a nearby route
          within two days of your date. Seats and prices can change.
        </p>
      </div>
      <ul className="flex flex-col gap-3" aria-label="Empty legs on this route">
        {offers.map((offer) => (
          <li key={offer.id}>
            <OfferCard offer={offer} />
          </li>
        ))}
      </ul>
    </section>
  );
}
