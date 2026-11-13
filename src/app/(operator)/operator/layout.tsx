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
import { operatorNav } from "@/lib/operator-access";

export const metadata: Metadata = { title: "Operator portal" };

const OPERATOR: Role[] = ["OPERATOR_ADMIN", "OPERATOR_STAFF"];

async function OperatorShell({ children }: { children: React.ReactNode }) {
  const session = await requireRole(OPERATOR, "/operator");
  const { data: operator } =
    await serverGet<Schemas["OperatorMeResponseDto"]>("operator/me");
  // Add an item when its page ships (docs/frontend/frontend-design.md). Who
  // sees what: lib/operator-access.ts (D-058, D-068).
  const nav: NavItem[] = operatorNav(operator.status, operator.access);
  return (
    <AppShell
      surface="Operator"
      nav={nav}
      user={{
        name: session.email ?? operator.displayName,
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
