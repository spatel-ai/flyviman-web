import Link from "next/link";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { homeFor, surfaceFor } from "@/lib/auth/roles";
import { HeaderScrollState } from "./header-scroll-state";
import { MobileNav } from "./mobile-nav";
import { MORE_NAV, SITE_NAV } from "./site-nav";
import { SiteNavLinks, SiteNavList } from "./site-nav-links";
import { UserMenu } from "./user-menu";

const LINK =
  "flex h-9 items-center rounded-pill px-4 text-body-sm font-medium transition-colors duration-150 ease-standard";

const CUSTOMER_LINKS = [
  { href: "/account", label: "Profile" },
  { href: "/account/passengers", label: "Saved passengers" },
  { href: "/account/notifications", label: "Notifications" },
];

function SignedOut() {
  return (
    <div className="flex items-center gap-1">
      <Link
        href="/login"
        className={`${LINK} text-foreground hover:bg-border/50`}
      >
        Sign in
      </Link>
      <Link
        href="/register"
        className={`${LINK} bg-accent-fill text-accent-foreground hover:bg-accent-fill-hover`}
      >
        Create account
      </Link>
    </div>
  );
}

async function Account() {
  // A public page must still render when the API cannot be reached.
  const session = await getSession().catch(() => null);
  if (!session) return <SignedOut />;

  const name =
    session.profile?.firstName ?? session.email ?? session.phone ?? "Account";
  const links =
    surfaceFor(session.role) === "customer"
      ? CUSTOMER_LINKS
      : [{ href: homeFor(session.role), label: "Open portal" }];
  return <UserMenu name={name} role={session.role} links={links} />;
}

/** Customer-surface navigation: translucent, sticky, minimal. */
export function SiteHeader() {
  return (
    <header className="site-header material-bar sticky top-0 z-40 border-b">
      <HeaderScrollState />
      <div className="mx-auto flex h-(--header-height) max-w-wide items-center justify-between px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-1 md:gap-6">
          <div className="-ml-2 lg:hidden">
            <MobileNav
              surface="Site"
              items={[{ href: "/", label: "Home" }, ...SITE_NAV, ...MORE_NAV]}
            />
          </div>
          <Link
            href="/"
            className="text-title tracking-tight"
            aria-label="Flyviman home"
          >
            Flyviman
          </Link>
          {/* The current page is marked once the address is known. */}
          <Suspense fallback={<SiteNavList active={null} />}>
            <SiteNavLinks />
          </Suspense>
        </div>
        {/* The page shell is static; the account area streams in. */}
        <Suspense fallback={<div className="h-9 w-24" aria-hidden="true" />}>
          <Account />
        </Suspense>
      </div>
    </header>
  );
}
