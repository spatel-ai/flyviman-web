"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/account", label: "Profile" },
  { href: "/account/passengers", label: "Saved passengers" },
  { href: "/account/notifications", label: "Notifications" },
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
          const current = pathname === item.href;
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
