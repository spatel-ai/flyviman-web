"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  /** Heading shown above a run of consecutive items that share it. */
  group?: string;
}

/** Splits the items into runs that share a group, keeping their order. */
export function sectionsOf(
  items: NavItem[],
): { group: string | undefined; items: NavItem[] }[] {
  const sections: { group: string | undefined; items: NavItem[] }[] = [];
  for (const item of items) {
    const last = sections[sections.length - 1];
    if (last && last.group === item.group) last.items.push(item);
    else sections.push({ group: item.group, items: [item] });
  }
  return sections;
}

/**
 * Longest matching item wins, so "/admin/operators" is active on
 * "/admin/operators/123". A portal's home ("/admin", "/operator") is every
 * page's prefix, so it matches only itself: on a page the user's navigation
 * does not list (a refused page), nothing is marked rather than "Dashboard".
 */
export function activeHref(pathname: string, items: NavItem[]): string | null {
  const matches = items
    .map((item) => item.href)
    .filter(
      (href) =>
        pathname === href ||
        (href.split("/").filter(Boolean).length > 1 &&
          pathname.startsWith(`${href}/`)),
    );
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
  const headingId = useId();
  const sections = sectionsOf(items);
  // One heading above one list says nothing: show them only to tell groups apart.
  const headings = sections.filter((section) => section.group).length > 1;
  return (
    <div className="flex flex-col gap-4">
      {sections.map((section, index) => {
        const labelId = `${headingId}-${index}`;
        return (
          <div key={section.group ?? `top-${index}`}>
            {headings && section.group ? (
              <p
                id={labelId}
                className="px-3 pb-1 text-caption font-medium text-muted"
              >
                {section.group}
              </p>
            ) : null}
            <ul
              aria-labelledby={headings && section.group ? labelId : undefined}
              className="flex flex-col gap-0.5"
            >
              {section.items.map((item) => {
                const current = item.href === active;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={current ? "page" : undefined}
                      onClick={onNavigate}
                      className={cn(
                        "flex h-9 items-center rounded-sm px-3 font-medium transition duration-150 ease-standard active:scale-97 motion-reduce:active:scale-100",
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
          </div>
        );
      })}
    </div>
  );
}
