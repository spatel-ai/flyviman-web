"use client";

import { DropdownMenu } from "radix-ui";
import Link from "next/link";
import {
  THEME_OPTIONS,
  applyTheme,
  useTheme,
  type Theme,
} from "@/components/theme/theme-switch";
import { UnreadBadge } from "@/components/shared/unread-badge";
import { unreadLabel, useUnreadCount } from "@/lib/api/notifications";
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
  const theme = useTheme();
  const unread = useUnreadCount();
  const initial = name.replace(/^\+/, "").charAt(0).toUpperCase() || "?";

  return (
    // Not modal: a modal menu hides the page with aria-hidden while its
    // focusable controls stay in the tab order (axe aria-hidden-focus).
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={unreadLabel("Account menu", unread)}
        className="relative flex size-9 items-center justify-center rounded-full bg-accent/10 text-body-sm font-semibold text-accent transition-colors duration-150 ease-standard hover:bg-accent/20"
      >
        <span aria-hidden="true">{initial}</span>
        {unread > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-surface-raised bg-accent-fill"
          />
        ) : null}
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
              <Link
                href={link.href}
                aria-label={
                  link.href.endsWith("/notifications")
                    ? unreadLabel(link.label, unread)
                    : undefined
                }
              >
                {link.label}
                {link.href.endsWith("/notifications") ? (
                  <UnreadBadge unread={unread} />
                ) : null}
              </Link>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-border/60" />
          {/* Radio items, so the menu holds only menu roles. The menu stays
              open after a choice, so the change is visible. */}
          <DropdownMenu.Group aria-label="Theme">
            <DropdownMenu.Label
              aria-hidden="true"
              className="px-3 pt-1 text-caption text-muted"
            >
              Theme
            </DropdownMenu.Label>
            <DropdownMenu.RadioGroup
              value={theme}
              onValueChange={(value) => applyTheme(value as Theme)}
            >
              {THEME_OPTIONS.map((option) => (
                <DropdownMenu.RadioItem
                  key={option.value}
                  value={option.value}
                  onSelect={(event) => event.preventDefault()}
                  className={`${ITEM} justify-between data-[state=checked]:font-semibold`}
                >
                  {option.label}
                  <DropdownMenu.ItemIndicator aria-hidden="true">
                    ✓
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Group>
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
