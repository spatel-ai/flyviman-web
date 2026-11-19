import {
  Facebook,
  Instagram,
  Linkedin,
  MessageCircle,
  Twitter,
  Youtube,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ScrollScrub } from "@/components/motion/scroll-scrub";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { CONTACT } from "@/content/contact";
import { type SocialNetwork, siteSettings } from "@/lib/site-settings";
import { LEGAL_NAV } from "./site-nav";

const SOCIAL_ICONS = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  x: Twitter,
  linkedin: Linkedin,
} satisfies Record<SocialNetwork, typeof Instagram>;

const LINK =
  "text-muted transition-colors duration-150 ease-standard hover:text-foreground";
/** A contact link, tall enough to tap. */
const CONTACT_LINK = `${LINK} inline-flex min-h-11 items-center`;

export function SiteFooter() {
  // On phones the tab bar covers the foot of the page, so it is padded.
  return (
    <footer className="site-footer border-t border-border/60 bg-surface max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-wide flex-col gap-8 px-4 py-10 md:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          {/* Decorative: the header already names the site. Not shown on
              phones, where it would only add height. */}
          <ScrollScrub
            aria-hidden="true"
            start="top bottom"
            end="clamp(top 75%)"
            from={{ opacity: 0.2, scaleX: 0.92 }}
            to={{ opacity: 1, scaleX: 1 }}
            className="site-footer__wordmark hidden origin-left text-display tracking-tight md:block"
          >
            {siteSettings.logoPath ? (
              <Image
                src={siteSettings.logoPath}
                alt="Flyviman"
                width={320}
                height={64}
                unoptimized
                className="h-16 w-auto"
              />
            ) : (
              "Flyviman"
            )}
          </ScrollScrub>
          <address className="text-body-sm text-muted not-italic">
            <p className="text-foreground">{CONTACT.officeLabel}</p>
            <p className="mt-1">{CONTACT.address}</p>
            <p className="mt-1 flex flex-wrap gap-x-4">
              {siteSettings.phones.map((phone) => (
                <a key={phone.href} href={phone.href} className={CONTACT_LINK}>
                  {phone.label}
                </a>
              ))}
              <a href={`mailto:${siteSettings.email}`} className={CONTACT_LINK}>
                {siteSettings.email}
              </a>
              {siteSettings.whatsappHref ? (
                <a
                  href={siteSettings.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${CONTACT_LINK} gap-1.5`}
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  WhatsApp
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : null}
            </p>
            {siteSettings.social.length > 0 ? (
              <ul aria-label="Social media" className="mt-1 flex gap-1">
                {siteSettings.social.map(({ network, label, href }) => {
                  const Icon = SOCIAL_ICONS[network];
                  return (
                    <li key={network}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${label} (opens in a new tab)`}
                        className={`${LINK} inline-flex size-11 items-center justify-center`}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </address>
        </div>
        <p className="text-caption text-muted">
          Estimates are not confirmed prices. Charter, helicopter and air
          ambulance bookings are confirmed only after operator acceptance.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-caption">
              {LEGAL_NAV.map((link) => (
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
        {/* The same closing line on every screen: stacked on phones, one row
            from tablets up. */}
        <div className="flex flex-col gap-1 border-t border-border/60 pt-6 text-caption text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© Flyviman. All rights reserved.</p>
          <p>
            Powered by{" "}
            <a
              href="https://technotribes.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center font-medium text-foreground/80 transition-colors duration-150 ease-standard hover:text-foreground"
            >
              Technotribes
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
