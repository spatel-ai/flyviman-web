"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/button-classes";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDuration } from "@/features/search/format";
import { formatMoney } from "@/lib/format/money";
import {
  clock,
  enquiryHref,
  isExpired,
  placeCode,
  placeName,
  stopsLabel,
  zoneOf,
} from "./logic";
import type { FareRules, RevalidateResult, ScheduledOffer } from "./types";

const SEARCH_AGAIN = "/search?service=flights";

function Fee({
  allowed,
  feeMinor,
  currency,
}: {
  allowed: boolean;
  feeMinor?: number;
  currency: string;
}) {
  if (!allowed) return <>Not allowed</>;
  return feeMinor ? (
    <>Allowed for {formatMoney(feeMinor, currency)}</>
  ) : (
    <>Allowed, no fee</>
  );
}

function Outcome({
  offer,
  result,
  now,
  alternatives,
  onPick,
  searchId,
}: {
  offer: ScheduledOffer;
  result: RevalidateResult;
  now: number;
  alternatives: ScheduledOffer[];
  onPick: (offerId: string) => void;
  searchId: string;
}) {
  const fare = result.fare ?? offer.fare;
  const validUntil = result.validUntil ?? offer.validUntil;
  if (result.status === "SOLD_OUT") {
    return (
      <div
        role="status"
        className="flex flex-col gap-3 rounded-md bg-surface p-4"
      >
        <p className="text-title">No seats left on this fare</p>
        <p className="text-body-sm text-muted">
          This flight sold out while you were looking. Other flights on this
          search:
        </p>
        {alternatives.length === 0 ? (
          <p className="text-body-sm text-muted">
            None are left on this search.{" "}
            <Link href={SEARCH_AGAIN} className="text-accent underline">
              Search again
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {alternatives.map((alt) => (
              <li key={alt.offerId}>
                <button
                  type="button"
                  onClick={() => onPick(alt.offerId)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-left text-body-sm hover:bg-surface-raised"
                >
                  <span>
                    {alt.carrier.name}{" "}
                    {clock(
                      alt.segments[0].departAt,
                      zoneOf(alt.segments[0], "from"),
                    )}
                  </span>
                  <span className="tabular-nums">
                    {formatMoney(alt.fare.amountMinor, alt.fare.currency)}
                    <span className="ml-2 text-caption text-muted">
                      Live fare
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  const expired = isExpired({ validUntil }, now);
  const changed = result.status === "PRICE_CHANGED";
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-md bg-surface p-4"
    >
      <p className="text-title">
        {changed ? "The price has changed" : "Price and seats confirmed"}
      </p>
      {changed ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-caption text-muted">Was</span>
            <PriceLabel
              amountMinor={offer.fare.amountMinor}
              currency={offer.fare.currency}
              priceType="LIVE_FARE"
              note="The fare you were shown"
              className="text-muted"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-caption text-muted">Now</span>
            <PriceLabel
              amountMinor={fare.amountMinor}
              currency={fare.currency}
              priceType="LIVE_FARE"
              validUntil={validUntil}
              expired={expired}
            />
          </div>
        </div>
      ) : (
        <PriceLabel
          amountMinor={fare.amountMinor}
          currency={fare.currency}
          priceType="LIVE_FARE"
          validUntil={validUntil}
          expired={expired}
        />
      )}
      {expired ? (
        <p className="text-body-sm">
          This fare has expired.{" "}
          <Link href={SEARCH_AGAIN} className="text-accent underline">
            Search again
          </Link>
        </p>
      ) : (
        <div className="flex flex-col items-start gap-2 border-t border-border pt-3">
          <p className="text-body-sm text-muted">
            Booking scheduled flights opens soon. Until then our team can help
            you book this fare.
          </p>
          <Link
            href={enquiryHref(offer, searchId)}
            className={buttonClasses({ variant: "secondary" })}
          >
            Send an enquiry
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * One offer in full: the flights, baggage, the fare rules and the
 * cancellation and change conditions (business rule 9), and the check that
 * asks the airline again for the price and the seats (rule 3). No booking is
 * offered yet.
 */
export function OfferDetail({
  searchId,
  offer,
  alternatives,
  now,
  onClose,
  onPick,
}: {
  searchId: string;
  offer: ScheduledOffer;
  alternatives: ScheduledOffer[];
  now: number;
  onClose: () => void;
  onPick: (offerId: string) => void;
}) {
  const [result, setResult] = useState<RevalidateResult | null>(null);
  const rules = useQuery({
    queryKey: queryKeys.scheduledFareRules(searchId, offer.offerId),
    queryFn: () =>
      apiFetch<FareRules>(
        `search/scheduled/${encodeURIComponent(searchId)}/offers/${encodeURIComponent(offer.offerId)}/fare-rules`,
      ),
  });
  const check = useMutation({
    mutationFn: () =>
      apiFetch<RevalidateResult>("search/scheduled/revalidate", {
        method: "POST",
        body: { searchId, offerId: offer.offerId },
      }),
    onSuccess: ({ data }) => setResult(data),
  });
  const expired = isExpired(offer, now);
  const first = offer.segments[0];
  const last = offer.segments[offer.segments.length - 1];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title={`${offer.carrier.name}: ${placeCode(first.from)} to ${placeCode(last.to)}`}
        description={`${offer.fare.fareFamily} fare · ${stopsLabel(offer.stops)}`}
        className="max-w-xl"
      >
        <ul aria-label="Flights" className="flex flex-col gap-2">
          {offer.segments.map((s) => (
            <li
              key={`${s.flightNumber}-${s.departAt}`}
              className="rounded-md bg-surface p-3 text-body-sm"
            >
              <span className="font-medium">{s.flightNumber}</span>{" "}
              {clock(s.departAt, zoneOf(s, "from"))} {placeName(s.from)} (
              {placeCode(s.from)}) to {clock(s.arriveAt, zoneOf(s, "to"))}{" "}
              {placeName(s.to)} ({placeCode(s.to)}) ·{" "}
              {formatDuration(s.durationMinutes)}
            </li>
          ))}
        </ul>
        <p className="text-body-sm text-muted">
          Cabin bag {offer.baggage.cabinKg} kg · Checked bag{" "}
          {offer.baggage.checkedKg} kg ·{" "}
          {offer.refundable ? "Refundable" : "Non-refundable"}
        </p>

        <section aria-label="Fare rules" className="flex flex-col gap-2">
          <h3 className="text-body font-medium">Fare rules</h3>
          {rules.isPending ? (
            <Skeleton className="h-24" />
          ) : rules.isError ? (
            <LoadError
              what="the fare rules"
              error={rules.error}
              onRetry={() => void rules.refetch()}
            />
          ) : (
            <>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
                <dt className="text-muted">Cancellation</dt>
                <dd>
                  {rules.data.data.cancellation.refundable ? (
                    rules.data.data.cancellation.feeMinor ? (
                      <>
                        Refundable, fee{" "}
                        {formatMoney(
                          rules.data.data.cancellation.feeMinor,
                          offer.fare.currency,
                        )}
                      </>
                    ) : (
                      <>Refundable, no fee</>
                    )
                  ) : (
                    <>Not refundable</>
                  )}
                </dd>
                <dt className="text-muted">Changes</dt>
                <dd>
                  <Fee
                    allowed={rules.data.data.change.allowed}
                    feeMinor={rules.data.data.change.feeMinor}
                    currency={offer.fare.currency}
                  />
                </dd>
              </dl>
              <ul className="flex flex-col gap-2">
                {rules.data.data.rules.map((rule) => (
                  <li key={rule.title} className="text-body-sm">
                    <span className="font-medium">{rule.title}.</span>{" "}
                    <span className="text-muted">{rule.text}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {result ? (
          <Outcome
            offer={offer}
            result={result}
            now={now}
            alternatives={alternatives}
            onPick={onPick}
            searchId={searchId}
          />
        ) : (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <PriceLabel
                amountMinor={offer.fare.amountMinor}
                currency={offer.fare.currency}
                priceType="LIVE_FARE"
                validUntil={offer.validUntil}
                expired={expired}
              />
              {offer.refundable ? (
                <Badge tone="success">Refundable</Badge>
              ) : null}
            </div>
            {expired ? (
              <p role="status" className="text-body-sm">
                This fare has expired.{" "}
                <Link href={SEARCH_AGAIN} className="text-accent underline">
                  Search again
                </Link>
              </p>
            ) : null}
            {check.isError ? (
              <p role="alert" className="text-body-sm text-danger">
                {messageFor(check.error)}
              </p>
            ) : null}
            <Button
              loading={check.isPending}
              disabled={expired}
              onClick={() => check.mutate()}
            >
              Check price and seats
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
