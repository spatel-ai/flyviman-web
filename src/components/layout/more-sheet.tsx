"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { activeHref } from "./nav-links";
import { MORE_NAV } from "./site-nav";

/** The "More" pages as a bottom sheet, opened from a header icon on phones. */
export function MoreSheetView({ active }: { active: string | null }) {
  return (
    <Sheet>
      <SheetTrigger
        aria-label="More"
        className="flex size-11 items-center justify-center rounded-pill text-foreground transition-colors duration-150 ease-standard hover:bg-surface"
      >
        <Menu size={20} strokeWidth={1.5} aria-hidden="true" />
      </SheetTrigger>
      <SheetContent title="More" side="left">
        <nav aria-label="More">
          <ul className="flex flex-col gap-1">
            {MORE_NAV.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <SheetClose asChild>
                  <Link
                    href={href}
                    aria-current={href === active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-sm px-3 font-medium transition-colors duration-150 ease-standard",
                      href === active
                        ? "bg-accent/10 text-accent"
                        : "text-foreground hover:bg-surface",
                    )}
                  >
                    <Icon
                      size={20}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="shrink-0"
                    />
                    {label}
                  </Link>
                </SheetClose>
              </li>
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

/**
 * The same sheet with the current page marked. Reads the address, so it is
 * rendered inside `<Suspense>` with `MoreSheetView` as the fallback.
 */
export function MoreSheet() {
  return <MoreSheetView active={activeHref(usePathname(), MORE_NAV)} />;
}
