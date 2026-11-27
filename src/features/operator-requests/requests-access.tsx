import type { ReactNode } from "react";
import { LockedState } from "@/components/shared/locked-state";
import type { Schemas } from "@/lib/api/types";
import { serverGet } from "@/lib/auth/server-api";
import { can, isOperatorAdmin } from "@/lib/operator-access";

/**
 * Decides on the server, before anything loads, whether this user may see
 * requests: the administrator, or staff with "manage bookings", and only once
 * the organisation is approved. The API decides every call again.
 */
export async function RequestsAccess({
  title,
  approvedOnly = true,
  children,
}: {
  title: string;
  /** The list waits for approval; a request's own page leaves that to the API (404 for none). */
  approvedOnly?: boolean;
  children: ReactNode;
}) {
  const { data: operator } =
    await serverGet<Schemas["OperatorMeResponseDto"]>("operator/me");
  const allowed =
    isOperatorAdmin(operator.access) || can(operator.access, "MANAGE_BOOKINGS");
  if (allowed && (!approvedOnly || operator.status === "APPROVED"))
    return <>{children}</>;
  return (
    <LockedState
      title={title}
      heading={
        allowed ? "Available once you are approved" : "Not part of your access"
      }
      reason={
        allowed
          ? "Requests for your aircraft appear here once Flyviman has approved your organisation."
          : "Your administrator can give you the Manage bookings permission."
      }
      next={allowedNext(allowed)}
    />
  );
}

const allowedNext = (allowed: boolean) =>
  allowed
    ? { href: "/operator/onboarding", label: "Company and documents" }
    : { href: "/operator", label: "Back to dashboard" };
