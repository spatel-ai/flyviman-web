"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { PriceLabel } from "@/components/shared/price-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import type { Schemas } from "@/lib/api/types";
import { formatMoney } from "@/lib/format/money";

type Preview = Schemas["PromoPreviewResponseDto"];

/**
 * A promotion code on one result: the trip priced again with it, shown as
 * an estimate with the discount on its own line. Nothing is stored; the
 * code is checked again when a booking request is sent with it.
 */
export function PromoCode({
  searchId,
  resultId,
  expired,
}: {
  searchId: string;
  resultId: string;
  /** The estimate has lapsed: a code cannot be tried on it. */
  expired: boolean;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const apply = useMutation({
    mutationFn: (value: string) =>
      apiFetch<Preview>(
        `search/${encodeURIComponent(searchId)}/results/${encodeURIComponent(resultId)}/promo-code`,
        { method: "POST", body: { code: value } },
      ).then((result) => result.data),
    onMutate: () => setError(null),
    onError: (failure) => setError(messageFor(failure)),
  });
  const preview = apply.data;

  function submit() {
    const value = code.trim();
    if (!value) {
      setError("Enter a code.");
      return;
    }
    apply.mutate(value);
  }

  return (
    <section aria-label="Promotion code" className="flex flex-col gap-3">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex items-end gap-2"
      >
        <Input
          label="Promotion code"
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            if (preview) apply.reset();
          }}
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={32}
          className="h-11 uppercase"
          error={error ?? undefined}
          disabled={expired}
        />
        <Button
          type="submit"
          variant="secondary"
          className="h-11 shrink-0"
          loading={apply.isPending}
          disabled={expired}
        >
          Apply
        </Button>
      </form>
      {preview ? (
        <div aria-live="polite" className="flex flex-col gap-2">
          {preview.amountOffMinor > 0 ? (
            <>
              <p className="text-body-sm">
                <span className="font-medium">{preview.name}</span>:{" "}
                {formatMoney(preview.amountOffMinor, preview.price.currency)}{" "}
                off this trip.
              </p>
              <PriceLabel
                amountMinor={preview.price.amountMinor}
                currency={preview.price.currency}
                priceType={preview.price.priceType}
                validUntil={preview.price.validUntil}
                variant="compact"
              />
              <p className="text-caption text-muted">
                With the code. It is checked again when your booking request is
                sent.
              </p>
            </>
          ) : (
            <p className="text-body-sm text-muted">
              {preview.code} is valid but does not lower the price of this trip.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
