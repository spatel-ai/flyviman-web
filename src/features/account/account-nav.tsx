"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/account", label: "Profile" },
  { href: "/account/trips", label: "Trips" },
  { href: "/account/passengers", label: "Saved passengers" },
  { href: "/account/notifications", label: "Notifications" },
  { href: "/account/air-ambulance", label: "Air ambulance" },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Account"
      className="overflow-x-auto border-b border-border/60"
    >
      <ul className="flex gap-6">
        {ITEMS.map((item) => {
          const current =
            pathname === item.href ||
            (item.href !== "/account" && pathname.startsWith(`${item.href}/`));
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
  );
}
