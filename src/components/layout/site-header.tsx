import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { siteSettings } from "@/lib/site-settings";
import { getSession } from "@/lib/auth/session";
import { homeFor, surfaceFor } from "@/lib/auth/roles";
import { HeaderScrollState } from "./header-scroll-state";
import { MoreSheet, MoreSheetView } from "./more-sheet";
import { CHARTER_HREF } from "./site-nav";
import { SiteNavLinks, SiteNavList } from "./site-nav-links";
import { UserMenu } from "./user-menu";

const LINK =
  "flex h-9 items-center rounded-pill px-4 text-body-sm font-medium transition-colors duration-150 ease-standard";

const CUSTOMER_LINKS = [
  { href: "/account", label: "Overview" },
  { href: "/account/profile", label: "Profile" },
  { href: "/account/passengers", label: "Saved passengers" },
  { href: "/account/notifications", label: "Notifications" },
];

function SignedOut() {
  return (
    // On phones the tab bar holds Sign in, and the login page offers
    // Create account.
    <div className="hidden items-center gap-1 md:flex">
      <Link
        href="/login"
        className={`${LINK} text-foreground hover:bg-border/50`}
      >
        Sign in
      </Link>
      <Link
        href="/register"
        className={`${LINK} border border-border text-foreground hover:bg-border/50`}
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
    <header className="site-header material-bar print:hidden sticky top-0 z-40 border-b">
      <HeaderScrollState />
      <div className="mx-auto flex h-(--header-height) max-w-wide items-center justify-between px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-1 md:gap-6">
          <Link
            href="/"
            className="text-title tracking-tight"
            aria-label="Flyviman home"
          >
            {siteSettings.logoPath ? (
              <Image
                src={siteSettings.logoPath}
                alt="Flyviman"
                width={160}
                height={32}
                unoptimized
                priority
                className="h-8 w-auto"
              />
            ) : (
              "Flyviman"
            )}
          </Link>
          {/* The current page is marked once the address is known. */}
          <Suspense fallback={<SiteNavList active={null} />}>
            <SiteNavLinks />
          </Suspense>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={CHARTER_HREF}
            className={`${LINK} hidden bg-accent/10 text-accent hover:bg-accent/20 md:flex`}
          >
            Request a charter
          </Link>
          <div className="md:hidden">
            <Suspense fallback={<MoreSheetView active={null} />}>
              <MoreSheet />
            </Suspense>
          </div>
          {/* The page shell is static; the account area streams in. */}
          <Suspense fallback={<div className="h-9 w-24" aria-hidden="true" />}>
            <Account />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
