"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MoreMenu } from "./more-menu";
import { activeHref } from "./nav-links";
import { MORE_NAV, SEARCH_NAV } from "./site-nav";

/** Search and the More menu, from the md breakpoint up. */
export function SiteNavList({ active }: { active: string | null }) {
  const searching = active === SEARCH_NAV.href;
  return (
    <nav aria-label="Site" className="hidden md:block">
      <ul className="flex items-center gap-1">
        <li>
          <Link
            href={SEARCH_NAV.href}
            aria-current={searching ? "page" : undefined}
            className={cn(
              "flex h-9 items-center rounded-pill px-3 text-body-sm transition-colors duration-150 ease-standard hover:text-foreground",
              // Weight and an underline as well as colour, so the current
              // page is not shown by colour alone (accessibility rules).
              searching
                ? "font-medium text-foreground underline decoration-current/40 decoration-2 underline-offset-8"
                : "text-muted",
            )}
          >
            {SEARCH_NAV.label}
          </Link>
        </li>
        <li>
          <MoreMenu active={active} />
        </li>
      </ul>
    </nav>
  );
}

/**
 * The same list with the current page marked. Reads the address, so it is
 * rendered inside `<Suspense>` with `SiteNavList` as the fallback.
 */
export function SiteNavLinks() {
  return (
    <SiteNavList
      active={activeHref(usePathname(), [SEARCH_NAV, ...MORE_NAV])}
    />
  );
}
