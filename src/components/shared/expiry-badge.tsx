"use client";

import { Badge } from "@/components/ui/badge";
import { expiryState, indiaToday } from "@/lib/format/expiry";
import { cn } from "@/lib/utils";

/**
 * Flags a document's expiry once it is within 30 days or past (M3 step 8).
 * Renders nothing for a date further out, so a list stays calm until
 * something needs doing.
 */
export function ExpiryBadge({
  expiresAt,
  className,
}: {
  expiresAt: string | null | undefined;
  className?: string;
}) {
  if (!expiresAt) return null;
  const state = expiryState(expiresAt, indiaToday());
  if (!state) return null;
  return (
    <Badge
      tone={state.tone}
      data-expiry={state.tone}
      className={cn("whitespace-nowrap", className)}
    >
      {state.label}
    </Badge>
  );
}
