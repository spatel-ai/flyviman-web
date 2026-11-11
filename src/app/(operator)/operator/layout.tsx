import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AppShell,
  AppShellSkeleton,
  type NavItem,
} from "@/components/layout/app-shell";
import type { Role, Schemas } from "@/lib/api/types";
import { serverGet } from "@/lib/auth/server-api";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Operator portal" };

const OPERATOR: Role[] = ["OPERATOR_ADMIN", "OPERATOR_STAFF"];

// Add an item when its page ships (docs/frontend/frontend-design.md).
const DASHBOARD: NavItem = { href: "/operator", label: "Dashboard" };
const APPLICATION: NavItem = {
  href: "/operator/onboarding",
  label: "Company and documents",
};

async function OperatorShell({ children }: { children: React.ReactNode }) {
  const session = await requireRole(OPERATOR, "/operator");
  const { data: operator } =
    await serverGet<Schemas["OperatorProfileResponseDto"]>("operator/profile");

  // Until the organisation is approved, only its application is available.
  // A suspended operator keeps the fleet so it can still ground an aircraft
  // (D-058); the API refuses anything that would add to the fleet.
  const fleet: NavItem = { href: "/operator/aircraft", label: "Fleet" };
  const nav =
    operator.status === "APPROVED"
      ? [DASHBOARD, fleet, APPLICATION]
      : operator.status === "SUSPENDED"
        ? [fleet, APPLICATION]
        : [APPLICATION];
  return (
    <AppShell
      surface="Operator"
      nav={nav}
      user={{
        name: session.email ?? operator.contactName,
        role: session.role,
      }}
    >
      {children}
    </AppShell>
  );
}

export default function OperatorLayout({ children }: LayoutProps<"/operator">) {
  // The shell is not shown until the session and role are confirmed. This
  // guards the shell, not the pages: a layout does not re-run on navigation
  // and does not gate its children. Every page gets its data from the API,
  // which checks the role on each request; a page that fetches on the server
  // must go through `serverGet`, never around it.
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <OperatorShell>{children}</OperatorShell>
    </Suspense>
  );
}
