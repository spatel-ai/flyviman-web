"use client";

import { DropdownMenu } from "radix-ui";
import Link from "next/link";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { useSignOut } from "@/features/auth/use-sign-out";
import type { Role } from "@/lib/api/types";
import { ROLE_LABELS } from "@/lib/auth/roles";

export interface UserMenuProps {
  /** Email, phone number or name: whatever identifies the account. */
  name: string;
  role: Role;
  links?: { href: string; label: string }[];
}

const ITEM =
  "flex h-10 cursor-default items-center rounded-sm px-3 text-body-sm font-medium text-foreground outline-none data-highlighted:bg-surface";

/** Account menu shared by every surface: who is signed in, theme, sign out. */
export function UserMenu({ name, role, links = [] }: UserMenuProps) {
  const { signOut, pending } = useSignOut();
  const initial = name.replace(/^\+/, "").charAt(0).toUpperCase() || "?";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Account menu"
        className="flex size-9 items-center justify-center rounded-full bg-accent/10 text-body-sm font-semibold text-accent transition-colors duration-150 ease-standard hover:bg-accent/20"
      >
        <span aria-hidden="true">{initial}</span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-64 rounded-md border border-border/60 bg-surface-raised p-2 shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="truncate text-body-sm font-medium">{name}</p>
            <p className="text-caption text-muted">{ROLE_LABELS[role]}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border/60" />
          {links.map((link) => (
            <DropdownMenu.Item key={link.href} asChild className={ITEM}>
              <Link href={link.href}>{link.label}</Link>
            </DropdownMenu.Item>
          ))}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-body-sm text-muted">Theme</span>
            <ThemeSwitch />
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border/60" />
          <DropdownMenu.Item
            className={ITEM}
            disabled={pending}
            onSelect={(event) => {
              event.preventDefault();
              void signOut();
            }}
          >
            {pending ? "Signing out…" : "Sign out"}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
