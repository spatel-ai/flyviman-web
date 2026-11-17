"use client";

import { ChevronDown } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MORE_NAV } from "./site-nav";

const ICON = { size: 18, strokeWidth: 1.5, "aria-hidden": true } as const;

/** The "More" menu in the header, from the md breakpoint up. */
export function MoreMenu({ active }: { active: string | null }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="group flex h-9 items-center gap-1 rounded-pill px-3 text-body-sm text-muted transition-colors duration-150 ease-standard hover:text-foreground data-[state=open]:text-foreground">
        More
        <ChevronDown
          {...ICON}
          size={16}
          className="transition-transform duration-150 ease-standard group-data-[state=open]:rotate-180"
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="z-50 w-60 rounded-md border border-border/60 bg-surface-raised p-2 shadow-lg"
        >
          {MORE_NAV.map(({ href, label, icon: Icon }) => (
            <DropdownMenu.Item
              key={href}
              asChild
              className={cn(
                "flex h-10 cursor-default items-center gap-3 rounded-sm px-3 text-body-sm font-medium outline-none data-highlighted:bg-surface",
                href === active ? "text-accent" : "text-foreground",
              )}
            >
              <Link
                href={href}
                aria-current={href === active ? "page" : undefined}
              >
                <Icon {...ICON} className="text-muted" />
                {label}
              </Link>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
