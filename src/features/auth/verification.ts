import type { Schemas } from "@/lib/api/types";

type Sent = Schemas["VerificationSentResponseDto"];

/** The page where the code for a just-started verification is entered. */
export function verifyPath(sent: Sent): string {
  const params = new URLSearchParams({
    id: sent.verificationId,
    to: sent.destination,
  });
  return `/verify?${params.toString()}`;
}

export type { Sent as VerificationSent };
