"use client";

import { House, Mail, Plane, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { activeHref } from "./nav-links";
import { CHARTER_HREF } from "./site-nav";

interface Tab {
  /** Where the tab goes. */
  href: string;
  /** The page that marks it current, when that differs from `href`. */
  match: string;
  label: string;
  icon: LucideIcon;
}

/**
 * The customer site's tab bar on phones (below md): the four places a
 * visitor goes most. Signed in, the last tab opens the account; signed out it
 * goes to sign in. Hidden in print. The footer reserves its height (h-14 plus the bottom inset).
 */
export function MobileTabBarView({
  signedIn,
  pathname,
}: {
  signedIn: boolean;
  /** Null until the address is known: no tab is marked. */
  pathname: string | null;
}) {
  const tabs: Tab[] = [
    { href: "/", match: "/", label: "Home", icon: House },
    { href: CHARTER_HREF, match: "/search", label: "Charter", icon: Plane },
    { href: "/contact", match: "/contact", label: "Enquire", icon: Mail },
    signedIn
      ? { href: "/account", match: "/account", label: "Account", icon: User }
      : { href: "/login", match: "/login", label: "Sign in", icon: User },
  ];
  const active = activeHref(
    pathname ?? "",
    tabs.map((tab) => ({ href: tab.match, label: tab.label })),
  );
  return (
    <nav
      aria-label="Primary"
      className="material-bar fixed inset-x-0 bottom-0 z-40 border-t border-border/60 pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
    >
      <ul className="grid grid-cols-4">
        {tabs.map(({ href, match, label, icon: Icon }) => {
          const current = match === active;
          return (
            <li key={label}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex h-14 min-h-11 flex-col items-center justify-center gap-0.5 text-caption transition-colors duration-150 ease-standard",
                  current ? "font-medium text-accent" : "text-muted",
                )}
              >
                <Icon
                  size={20}
                  strokeWidth={current ? 2 : 1.5}
                  aria-hidden="true"
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * The same bar with the current page marked. Reads the address, so it is
 * rendered inside `<Suspense>` with `MobileTabBarView` as the fallback.
 */
export function MobileTabBar({ signedIn }: { signedIn: boolean }) {
  return <MobileTabBarView signedIn={signedIn} pathname={usePathname()} />;
}
