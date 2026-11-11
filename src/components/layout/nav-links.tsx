"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
}

/** Longest matching item wins, so "/admin" is not active on "/admin/users". */
export function activeHref(pathname: string, items: NavItem[]): string | null {
  const matches = items
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`));
  return matches.sort((a, b) => b.length - a.length)[0] ?? null;
}

export function NavLinks({
  items,
  onNavigate,
}: {
  items: NavItem[];
  /** Called when a link is followed, for example to close a drawer. */
  onNavigate?: () => void;
}) {
  const active = activeHref(usePathname(), items);
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const current = item.href === active;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                "flex h-10 items-center rounded-sm px-3 font-medium transition-colors duration-150 ease-standard",
                current
                  ? "bg-accent/10 text-accent"
                  : "text-foreground hover:bg-surface",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
