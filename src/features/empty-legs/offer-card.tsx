import { Plane } from "lucide-react";
import Link from "next/link";
import { PriceLabel } from "@/components/shared/price-label";
import { Card } from "@/components/ui/card";
import {
  aircraftLabel,
  routeLabel,
  validUntilLabel,
  windowLabel,
} from "./format";
import type { EmptyLegOffer } from "./types";

export function OfferCard({ offer }: { offer: EmptyLegOffer }) {
  return (
    <Card
      variant="interactive"
      className="flex flex-wrap items-start justify-between gap-4"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <Link
          href={`/empty-legs/${encodeURIComponent(offer.id)}`}
          className="flex items-center gap-2 text-title text-accent hover:underline"
        >
          <Plane size={18} strokeWidth={1.5} aria-hidden />
          {routeLabel(offer)}
        </Link>
        <p className="text-body-sm text-muted">{aircraftLabel(offer)}</p>
        <p className="text-body-sm">{windowLabel(offer)}</p>
        <p className="text-body-sm text-muted">
          {offer.seatsAvailable} {offer.seatsAvailable === 1 ? "seat" : "seats"}{" "}
          available · {validUntilLabel(offer)}
        </p>
      </div>
      <PriceLabel
        amountMinor={offer.price.amountMinor}
        currency={offer.price.currency}
        priceType={offer.price.priceType}
        variant="compact"
      />
    </Card>
  );
}
