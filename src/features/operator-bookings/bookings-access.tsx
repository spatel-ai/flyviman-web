import type { ReactNode } from "react";
import { LockedState } from "@/components/shared/locked-state";
import type { Schemas } from "@/lib/api/types";
import { serverGet } from "@/lib/auth/server-api";
import { can, isOperatorAdmin } from "@/lib/operator-access";

/**
 * Decides on the server, before anything loads, whether this user may see
 * bookings: the administrator, or staff with "manage bookings", once the
 * organisation is approved. The API decides every call again.
 */
export async function BookingsAccess({
  title,
  approvedOnly = true,
  children,
}: {
  title: string;
  /** The list waits for approval; a booking's own page leaves that to the API (404 for none). */
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
        allowed ? "Available while you are approved" : "Not part of your access"
      }
      reason={
        allowed
          ? "Bookings on your aircraft appear here while Flyviman has your organisation approved."
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
