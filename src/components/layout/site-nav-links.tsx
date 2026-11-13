"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { activeHref } from "./nav-links";
import { SITE_NAV } from "./site-nav";

/** The site's pages across the header, from the md breakpoint up. */
export function SiteNavList({ active }: { active: string | null }) {
  return (
    <nav aria-label="Site" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {SITE_NAV.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.href === active ? "page" : undefined}
              className={cn(
                "flex h-9 items-center rounded-pill px-3 text-body-sm transition-colors duration-150 ease-standard hover:text-foreground",
                item.href === active ? "text-foreground" : "text-muted",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The same list with the current page marked. Reads the address, so it is
 * rendered inside `<Suspense>` with `SiteNavList` as the fallback.
 */
export function SiteNavLinks() {
  return <SiteNavList active={activeHref(usePathname(), SITE_NAV)} />;
}
