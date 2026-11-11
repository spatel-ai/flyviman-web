import Link from "next/link";
import { ThemeSwitch } from "@/components/theme/theme-switch";

const LINKS = [
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/image-credits", label: "Image credits" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer border-t border-border/60 bg-surface">
      <div className="mx-auto flex max-w-wide flex-col gap-6 px-4 py-8 md:px-6 lg:px-8">
        <p className="text-caption text-muted">
          Estimates are not confirmed prices. Charter, helicopter and air
          ambulance bookings are confirmed only after operator acceptance.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-caption">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted transition-colors duration-150 ease-standard hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <ThemeSwitch />
        </div>
      </div>
    </footer>
  );
}
