import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
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
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { data: operator } =
    await serverGet<Schemas["OperatorMeResponseDto"]>("operator/me");
  const allowed =
    isOperatorAdmin(operator.access) || can(operator.access, "MANAGE_BOOKINGS");
  if (allowed && operator.status === "APPROVED") return <>{children}</>;
  return (
    <>
      <h1 className="text-h2">{title}</h1>
      <Card variant="raised" className="mt-6">
        <h2 className="text-title">
          {allowed
            ? "Available while you are approved"
            : "Not part of your access"}
        </h2>
        <p className="mt-2 text-muted">
          {allowed
            ? "Bookings on your aircraft appear here while Flyviman has your organisation approved."
            : "Your administrator can give you the Manage bookings permission."}
        </p>
      </Card>
    </>
  );
}
