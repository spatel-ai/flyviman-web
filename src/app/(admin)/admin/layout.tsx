import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AppShell,
  AppShellSkeleton,
  type NavItem,
} from "@/components/layout/app-shell";
import type { Role } from "@/lib/api/types";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Admin portal" };

const INTERNAL: Role[] = ["OPS", "FINANCE_ADMIN", "SUPER_ADMIN"];

// Add an item when its page ships (docs/frontend/frontend-design.md). `roles`
// only hides links a role cannot use; the API decides what it may do.
const NAV: (NavItem & { roles: Role[] })[] = [
  { href: "/admin", label: "Dashboard", roles: INTERNAL },
  { href: "/admin/operators", label: "Operators", roles: INTERNAL },
  { href: "/admin/users", label: "Users", roles: ["OPS", "SUPER_ADMIN"] },
];

async function AdminShell({ children }: { children: React.ReactNode }) {
  const session = await requireRole(INTERNAL, "/admin");
  const nav = NAV.filter((item) => item.roles.includes(session.role));
  return (
    <AppShell
      surface="Admin"
      nav={nav}
      user={{ name: session.email ?? "Staff", role: session.role }}
    >
      {children}
    </AppShell>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  // The shell is not shown until the session and role are confirmed. This
  // guards the shell, not the pages: a layout does not re-run on navigation
  // and does not gate its children. Every page gets its data from the API,
  // which checks the role on each request; a page that fetches on the server
  // must go through `serverGet`, never around it.
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
