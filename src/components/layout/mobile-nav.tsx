"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NavLinks, type NavItem } from "./nav-links";

/** The portal navigation as a drawer, for screens too narrow for the sidebar. */
export function MobileNav({
  surface,
  items,
}: {
  surface: string;
  items: NavItem[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open navigation"
        className="flex size-10 items-center justify-center rounded-sm text-foreground hover:bg-surface"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </SheetTrigger>
      <SheetContent title={`${surface} navigation`} hideTitle side="left">
        <nav aria-label={`${surface} navigation`} className="pt-8">
          <NavLinks items={items} onNavigate={() => setOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
