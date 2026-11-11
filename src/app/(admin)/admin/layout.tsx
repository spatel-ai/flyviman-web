import type { Metadata } from "next";
import { AppShell, type NavItem } from "@/components/layout/app-shell";

export const metadata: Metadata = { title: "Admin portal" };

// Add an item when its page ships (docs/frontend/frontend-design.md).
const NAV: NavItem[] = [{ href: "/admin", label: "Dashboard" }];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell surface="Admin" nav={NAV}>
      {children}
    </AppShell>
  );
}
