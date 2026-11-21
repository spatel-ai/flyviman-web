"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing } from "lucide-react";
import Link from "next/link";
import { useNow } from "@/components/booking/use-now";
import { CancellationTerms } from "@/components/shared/cancellation-terms";
import { StickyActionBar } from "@/components/layout/sticky-action-bar";
import { LoadError } from "@/components/shared/load-error";
import { PriceLabel } from "@/components/shared/price-label";
import { RecordNotFound } from "@/components/shared/record-not-found";
import { Button } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { ApiError, isNotFoundError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import { useMe } from "@/lib/api/use-me";
import {
  aircraftLabel,
  enquiryHref,
  isLapsed,
  routeLabel,
  validUntilLabel,
  windowLabel,
} from "@/lib/empty-legs/format";
import type { EmptyLegDetail as Detail } from "@/lib/empty-legs/types";

/**
 * One empty-leg offer. Its conditions and Flyviman's cancellation terms come
 * before the request (business rule 9). "Request this empty leg" opens the
 * request page (`/book/empty-leg/[id]`); nothing is booked or charged until
 * the operator confirms. Once the departure window has begun the offer can
 * only be asked about, as an enquiry.
 */
export function EmptyLegDetail({ id }: { id: string }) {
  const now = useNow();
  const offer = useQuery({
    queryKey: queryKeys.emptyLeg(id),
    queryFn: () => apiFetch<Detail>(`empty-legs/${encodeURIComponent(id)}`),
  });

  if (offer.isPending) return <Skeleton className="h-96" />;
  if (offer.isError) {
    if (isEnded(offer.error)) {
      return (
        <RecordNotFound
          title="This offer has ended"
          description="It was withdrawn or its validity has passed. Other empty legs may suit you."
          backHref="/empty-legs"
          backLabel="See all empty legs"
        />
      );
    }
    return isNotFoundError(offer.error) ? (
      <RecordNotFound
        title="Offer not found"
        description="This offer does not exist or is no longer available."
        backHref="/empty-legs"
        backLabel="See all empty legs"
      />
    ) : (
      <LoadError
        what="this offer"
        error={offer.error}
        onRetry={() => void offer.refetch()}
      />
    );
  }

  const item = offer.data.data;
  // Only a published offer can be asked about; the API's status says so, and
  // validity passing while the page is open is caught here (rules 1 and 4).
  const open = item.status === "PUBLISHED" && !(now > 0 && isLapsed(item, now));
  // The API refuses a request once the window has begun; an enquiry still works.
  const requestable =
    open && !(now > 0 && new Date(item.departureFrom).getTime() <= now);
  const action = requestable
    ? {
        href: `/book/empty-leg/${encodeURIComponent(item.id)}`,
        label: "Request this empty leg",
        note: "This sends a request. Nothing is booked or charged. The operator confirms the flight and the price first.",
      }
    : {
        href: enquiryHref(item),
        label: "Ask about this flight",
        note: "This sends an enquiry. Nothing is booked or charged. The operator confirms seats and the price first.",
      };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/empty-legs"
          className="text-body-sm text-accent hover:underline"
        >
          All empty legs
        </Link>
        <h1 className="text-h3 md:text-h2">{routeLabel(item)}</h1>
        <p className="text-body text-muted">
          {aircraftLabel(item)} · {item.aircraft.seats} seats · operated by{" "}
          {item.operatorName}
        </p>
        <p className="text-body">{windowLabel(item)}</p>
        <p className="text-body-sm text-muted">
          {item.seatsAvailable} {item.seatsAvailable === 1 ? "seat" : "seats"}{" "}
          available · {validUntilLabel(item)}
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_20rem] md:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          {!open ? (
            <p role="status" className="text-body-sm text-danger">
              This offer is no longer open, so it cannot be requested.
            </p>
          ) : null}
          <Card className="flex flex-col gap-4 p-6">
            <PriceLabel
              amountMinor={item.price.amountMinor}
              currency={item.price.currency}
              priceType={item.price.priceType}
              validUntil={item.validUntil}
              expired={!open}
            />
          </Card>
          <section className="flex flex-col gap-2" aria-labelledby="el-terms">
            <h2 id="el-terms" className="text-title">
              Conditions
            </h2>
            <p className="whitespace-pre-line text-body-sm text-muted">
              {item.conditions}
            </p>
            <p className="text-body-sm text-muted">
              Flights depend on the operator&apos;s plans and can change or be
              withdrawn before a booking is confirmed.
            </p>
          </section>
          <CancellationTerms
            summary={item.cancellationTerms.summary}
            charges={item.cancellationTerms.tiers}
          />
        </div>

        <aside
          aria-label="Request"
          className="flex flex-col gap-4 rounded-xl bg-surface p-6 md:sticky md:top-24"
        >
          {open ? (
            <>
              <Link
                href={action.href}
                className={buttonClasses({
                  size: "lg",
                  className: "max-md:hidden",
                })}
              >
                {action.label}
              </Link>
              <p className="text-caption text-muted">{action.note}</p>
            </>
          ) : null}
          <InterestToggle offer={item} />
        </aside>
      </div>

      {open ? (
        <StickyActionBar label={action.label}>
          <div className="flex items-center justify-between gap-3">
            <PriceLabel
              amountMinor={item.price.amountMinor}
              currency={item.price.currency}
              priceType={item.price.priceType}
              validUntil={item.validUntil}
              variant="compact"
            />
            <Link href={action.href} className={buttonClasses({})}>
              {action.label}
            </Link>
          </div>
          <p className="mt-2 line-clamp-2 text-caption text-muted">
            Conditions above. Nothing is booked or charged.
          </p>
        </StickyActionBar>
      ) : null}
    </div>
  );
}

/** The API answers 410 for an offer that was withdrawn or has expired. */
function isEnded(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === "EMPTY_LEG_EXPIRED" || error.code === "EMPTY_LEG_WITHDRAWN")
  );
}

/** "Notify me of changes", for a signed-in customer; others are shown the way in. */
function InterestToggle({ offer }: { offer: Detail }) {
  const me = useMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const base = `empty-legs/${encodeURIComponent(offer.id)}/interest`;
  const interested = offer.interested;

  const toggle = useMutation({
    mutationFn: () =>
      apiFetch(base, { method: interested ? "DELETE" : "POST" }),
    onSuccess: async () => {
      toast({
        title: interested
          ? "You will not be notified"
          : "We will tell you if this offer changes",
        tone: "success",
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.emptyLeg(offer.id),
      });
    },
    onError: (failure) => toast({ title: messageFor(failure), tone: "danger" }),
  });

  if (me.isPending) return null;
  if (me.data?.role !== "CUSTOMER") {
    return me.data ? null : (
      <p className="text-body-sm text-muted">
        <Link
          href={`/login?next=${encodeURIComponent(`/empty-legs/${offer.id}`)}`}
          className="text-accent hover:underline"
        >
          Sign in
        </Link>{" "}
        to be notified if this offer changes.
      </p>
    );
  }
  return (
    <Button
      variant="secondary"
      loading={toggle.isPending}
      aria-pressed={interested}
      onClick={() => toggle.mutate()}
    >
      <BellRing size={16} strokeWidth={1.5} aria-hidden />
      {interested ? "Stop notifying me" : "Notify me of changes"}
    </Button>
  );
}
