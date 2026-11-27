import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  AppShell,
  AppShellSkeleton,
  type NavItem,
} from "@/components/layout/app-shell";
import type { Role } from "@/lib/api/types";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s · Admin · Flyviman",
  },
};

const INTERNAL: Role[] = ["OPS", "FINANCE_ADMIN", "SUPER_ADMIN"];

// Add an item when its page ships (docs/frontend/frontend-design.md). `roles`
// only hides links a role cannot use; the API decides what it may do.
const NAV: (NavItem & { roles: Role[] })[] = [
  { href: "/admin", label: "Dashboard", roles: INTERNAL },
  { href: "/admin/reports", label: "Reports", roles: INTERNAL },
  {
    href: "/admin/bookings",
    label: "Bookings",
    group: "Operations",
    roles: INTERNAL,
  },
  {
    href: "/admin/change-requests",
    label: "Change requests",
    group: "Operations",
    roles: ["OPS", "SUPER_ADMIN"],
  },
  {
    href: "/admin/air-ambulance",
    label: "Air ambulance",
    group: "Operations",
    roles: ["OPS", "SUPER_ADMIN"],
  },
  {
    href: "/admin/empty-legs",
    label: "Empty legs",
    group: "Operations",
    roles: ["OPS", "SUPER_ADMIN"],
  },
  {
    href: "/admin/enquiries",
    label: "Enquiries",
    group: "Operations",
    roles: ["OPS", "SUPER_ADMIN"],
  },
  {
    href: "/admin/operators",
    label: "Operators",
    group: "Operators and fleet",
    roles: INTERNAL,
  },
  {
    href: "/admin/aircraft",
    label: "Aircraft",
    group: "Operators and fleet",
    roles: ["OPS", "SUPER_ADMIN"],
  },
  {
    href: "/admin/documents",
    label: "Expiring documents",
    group: "Operators and fleet",
    roles: ["OPS", "SUPER_ADMIN"],
  },
  {
    href: "/admin/locations",
    label: "Locations",
    group: "Operators and fleet",
    roles: ["OPS", "SUPER_ADMIN"],
  },
  {
    href: "/admin/pricing/rules",
    label: "Pricing rules",
    group: "Pricing",
    roles: ["FINANCE_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/admin/promotions",
    label: "Promotions",
    group: "Pricing",
    roles: ["FINANCE_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/admin/matching-limits",
    label: "Matching limits",
    group: "Pricing",
    roles: INTERNAL,
  },
  {
    href: "/admin/pricing/calculations",
    label: "Price calculations",
    group: "Pricing",
    roles: INTERNAL,
  },
  {
    href: "/admin/payments",
    label: "Payments",
    group: "Finance",
    roles: ["FINANCE_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/admin/refunds",
    label: "Refunds",
    group: "Finance",
    roles: ["FINANCE_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/admin/settlements",
    label: "Settlements",
    group: "Finance",
    roles: ["FINANCE_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/admin/reconciliation",
    label: "Reconciliation",
    group: "Finance",
    roles: ["FINANCE_ADMIN", "SUPER_ADMIN"],
  },
  {
    href: "/admin/users",
    label: "Users",
    group: "Platform",
    roles: ["OPS", "SUPER_ADMIN"],
  },
  {
    href: "/admin/roles",
    label: "Roles",
    group: "Platform",
    roles: ["SUPER_ADMIN"],
  },
  {
    href: "/admin/content",
    label: "Content",
    group: "Platform",
    roles: ["OPS", "SUPER_ADMIN"],
  },
  {
    href: "/admin/category-config",
    label: "Categories",
    group: "Platform",
    roles: INTERNAL,
  },
  {
    href: "/admin/notifications",
    label: "Notifications",
    group: "Platform",
    roles: ["OPS", "SUPER_ADMIN"],
  },
  {
    href: "/admin/audit-logs",
    label: "Audit log",
    group: "Platform",
    roles: INTERNAL,
  },
];

async function AdminShell({ children }: { children: React.ReactNode }) {
  const session = await requireRole(INTERNAL, "/admin");
  const nav: NavItem[] = NAV.filter((item) =>
    item.roles.includes(session.role),
  ).map(({ href, label, group }) => ({ href, label, group }));
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

/**
 * The portal is rendered per request, with no prerendered shell, so Next.js
 * puts the request's Content-Security-Policy nonce (set by `proxy.ts`) on
 * every script on the page. `instant = false` allows the wait below.
 */
export const instant = false;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await connection();
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
