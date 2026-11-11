import type { Metadata } from "next";
import { AppShell, type NavItem } from "@/components/layout/app-shell";

export const metadata: Metadata = { title: "Operator portal" };

// Add an item when its page ships (docs/frontend/frontend-design.md).
const NAV: NavItem[] = [{ href: "/operator", label: "Dashboard" }];

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell surface="Operator" nav={NAV}>
      {children}
    </AppShell>
  );
}
