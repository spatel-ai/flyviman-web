"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { ForbiddenState } from "@/components/shared/locked-state";
import { PriceLabel } from "@/components/shared/price-label";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, RouteText, TruncatedText } from "@/components/ui/table";
import { placeLabel, windowLabel } from "@/lib/empty-legs/format";
import type { OperatorEmptyLeg } from "@/lib/empty-legs/types";
import { apiFetch } from "@/lib/api/client";
import { isForbiddenError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import { useOperatorAccess, useOperatorApproved } from "@/lib/operator";
import { can } from "@/lib/operator-access";
import { sortOffers } from "@/lib/sort/departure-order";

const PAGE_SIZE = 20;

export function OfferList() {
  const router = useRouter();
  const params = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const approved = useOperatorApproved();
  const access = useOperatorAccess();
  const offers = useQuery({
    queryKey: [...queryKeys.operatorEmptyLegs, "list", page] as const,
    queryFn: () =>
      apiFetch<OperatorEmptyLeg[]>("operator/empty-legs", {
        query: { page, pageSize: PAGE_SIZE, sort: "departure_asc" },
      }),
  });

  if (offers.isPending) return <Skeleton className="mt-6 h-40" />;
  if (offers.isError) {
    if (isForbiddenError(offers.error)) return <ForbiddenState />;
    return (
      <p className="mt-6 text-danger" role="alert">
        {messageFor(offers.error)}
      </p>
    );
  }
  // The API orders by departure across pages. The status grouping is still
  // done here, so it covers the fetched page only.
  const rows = sortOffers(offers.data.data);
  const addOffer =
    approved && can(access, "MANAGE_EMPTY_LEGS") ? (
      <Link href="/operator/empty-legs/new" className={buttonClasses({})}>
        Add an offer
      </Link>
    ) : null;
  return (
    <div className="mt-6 flex flex-col gap-4">
      {addOffer && rows.length > 0 ? <div>{addOffer}</div> : null}
      {rows.length === 0 ? (
        <EmptyState
          title="No empty legs yet"
          description="Add a flight that would otherwise fly empty. It is shown to customers once operations approve it."
          action={addOffer}
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {rows.map((item) => (
              <li key={item.id}>
                <Card
                  variant="raised"
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/operator/empty-legs/${encodeURIComponent(item.id)}`}
                      className="block text-title text-accent hover:underline"
                    >
                      <RouteText
                        origin={placeLabel(item.origin)}
                        destination={placeLabel(item.destination)}
                      />
                    </Link>
                    <TruncatedText
                      title={`${item.reference} · ${item.aircraft.type} · ${windowLabel(item)}`}
                      className="text-body-sm text-muted"
                    >
                      {item.reference} · {item.aircraft.type} ·{" "}
                      {windowLabel(item)}
                    </TruncatedText>
                    <p className="text-body-sm text-muted">
                      {item.seatsAvailable} seats
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <PriceLabel
                      amountMinor={item.price.amountMinor}
                      currency={item.price.currency}
                      priceType={item.price.priceType}
                      variant="compact"
                    />
                    <StatusBadge kind="emptyLeg" status={item.status} />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            pageSize={offers.data.meta.pageSize ?? PAGE_SIZE}
            total={offers.data.meta.total ?? rows.length}
            onPageChange={(next) =>
              router.replace(`/operator/empty-legs?page=${next}`)
            }
          />
        </>
      )}
    </div>
  );
}
