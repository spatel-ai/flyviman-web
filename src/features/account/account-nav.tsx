"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/account", label: "Overview" },
  { href: "/account/profile", label: "Profile" },
  { href: "/account/trips", label: "Trips" },
  { href: "/account/passengers", label: "Saved passengers" },
  { href: "/account/notifications", label: "Notifications" },
  { href: "/account/air-ambulance", label: "Air ambulance" },
];

export function AccountNav() {
  const pathname = usePathname();
  const scroller = useRef<HTMLElement>(null);
  const [more, setMore] = useState({ start: false, end: false });

  useEffect(() => {
    const nav = scroller.current;
    if (!nav) return;
    const update = () =>
      setMore({
        start: nav.scrollLeft > 1,
        end: nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1,
      });
    // Bring the current tab into view when the strip is cut off.
    const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
    if (active) {
      const left = active.offsetLeft;
      const right = left + active.offsetWidth;
      if (right > nav.scrollLeft + nav.clientWidth) {
        nav.scrollLeft = right - nav.clientWidth;
      } else if (left < nav.scrollLeft) {
        nav.scrollLeft = left;
      }
    }
    update();
    nav.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      nav.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  return (
    <div className="relative">
      <nav
        ref={scroller}
        aria-label="Account"
        className="overflow-x-auto border-b border-border/60"
      >
        <ul className="relative flex gap-6">
          {ITEMS.map((item) => {
            const current =
              pathname === item.href ||
              (item.href !== "/account" &&
                pathname.startsWith(`${item.href}/`));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center border-b-2 text-body-sm font-medium whitespace-nowrap transition-colors duration-150 ease-standard",
                    current
                      ? "border-accent text-foreground"
                      : "border-transparent text-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <span
        aria-hidden="true"
        data-testid="account-nav-fade-start"
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r from-background to-transparent transition-opacity duration-150 ease-standard",
          more.start ? "opacity-100" : "opacity-0",
        )}
      />
      <span
        aria-hidden="true"
        data-testid="account-nav-fade-end"
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-background to-transparent transition-opacity duration-150 ease-standard",
          more.end ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
