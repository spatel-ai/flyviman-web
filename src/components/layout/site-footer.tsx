import Link from "next/link";
import { ScrollScrub } from "@/components/motion/scroll-scrub";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { CONTACT } from "@/content/contact";
import { MORE_NAV, SITE_NAV } from "./site-nav";

const LINKS = [
  ...SITE_NAV,
  ...MORE_NAV,
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/image-credits", label: "Image credits" },
];

const LINK =
  "text-muted transition-colors duration-150 ease-standard hover:text-foreground";
/** A contact link, tall enough to tap. */
const CONTACT_LINK = `${LINK} inline-flex min-h-11 items-center`;

export function SiteFooter() {
  return (
    <footer className="site-footer border-t border-border/60 bg-surface">
      <div className="mx-auto flex max-w-wide flex-col gap-8 px-4 py-10 md:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          {/* Decorative: the header already names the site. It starts
              narrower, never wider, so it cannot overflow a phone. */}
          <ScrollScrub
            aria-hidden="true"
            start="top bottom"
            end="clamp(top 75%)"
            from={{ opacity: 0.2, scaleX: 0.92 }}
            to={{ opacity: 1, scaleX: 1 }}
            className="site-footer__wordmark origin-left text-display tracking-tight"
          >
            Flyviman
          </ScrollScrub>
          <address className="text-body-sm text-muted not-italic">
            <p className="text-foreground">{CONTACT.officeLabel}</p>
            <p className="mt-1">{CONTACT.address}</p>
            <p className="mt-1 flex flex-wrap gap-x-4">
              {CONTACT.phones.map((phone) => (
                <a key={phone.href} href={phone.href} className={CONTACT_LINK}>
                  {phone.label}
                </a>
              ))}
              <a href={`mailto:${CONTACT.email}`} className={CONTACT_LINK}>
                {CONTACT.email}
              </a>
            </p>
          </address>
        </div>
        <p className="text-caption text-muted">
          Estimates are not confirmed prices. Charter, helicopter and air
          ambulance bookings are confirmed only after operator acceptance.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-caption">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <ThemeSwitch />
        </div>
        <p className="text-caption text-muted">
          © Flyviman. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
