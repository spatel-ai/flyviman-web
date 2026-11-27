"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { useId, useState } from "react";
import { UnreadBadge } from "@/components/shared/unread-badge";
import { unreadLabel, useUnreadCount } from "@/lib/api/notifications";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  /** Heading shown above a run of consecutive items that share it. */
  group?: string;
}

/** Splits the items into runs that share a group, keeping their order. */
export function sectionsOf(
  items: NavItem[],
): { group: string | undefined; items: NavItem[] }[] {
  const sections: { group: string | undefined; items: NavItem[] }[] = [];
  for (const item of items) {
    const last = sections[sections.length - 1];
    if (last && last.group === item.group) last.items.push(item);
    else sections.push({ group: item.group, items: [item] });
  }
  return sections;
}

/**
 * Longest matching item wins, so "/admin/operators" is active on
 * "/admin/operators/123". A portal's home ("/admin", "/operator") is every
 * page's prefix, so it matches only itself: on a page the user's navigation
 * does not list (a refused page), nothing is marked rather than "Dashboard".
 */
export function activeHref(pathname: string, items: NavItem[]): string | null {
  const matches = items
    .map((item) => item.href)
    .filter(
      (href) =>
        pathname === href ||
        (href.split("/").filter(Boolean).length > 1 &&
          pathname.startsWith(`${href}/`)),
    );
  return matches.sort((a, b) => b.length - a.length)[0] ?? null;
}

const ROW =
  "flex h-9 items-center rounded-sm px-3 font-medium transition duration-150 ease-standard active:scale-97 motion-reduce:active:scale-100";

export function NavLinks({
  items,
  onNavigate,
}: {
  items: NavItem[];
  /** Called when a link is followed, for example to close a drawer. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = activeHref(pathname, items);
  const unread = useUnreadCount();
  const headingId = useId();
  const sections = sectionsOf(items);
  // One category above one list says nothing: use categories only to tell groups apart.
  const headings = sections.filter((section) => section.group).length > 1;
  const activeGroup = items.find((item) => item.href === active)?.group ?? null;
  // The open category follows the route: it is the current page's group on the
  // first render (server and client agree) and again after every navigation.
  const [seen, setSeen] = useState(pathname);
  const [open, setOpen] = useState<string | null>(activeGroup);
  if (seen !== pathname) {
    setSeen(pathname);
    setOpen(activeGroup);
  }
  const notificationsGroup =
    items.find((item) => item.href.endsWith("/notifications"))?.group ?? null;

  const renderLink = (item: NavItem, indent: boolean) => {
    const current = item.href === active;
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          aria-current={current ? "page" : undefined}
          aria-label={
            item.href.endsWith("/notifications")
              ? unreadLabel(item.label, unread)
              : undefined
          }
          onClick={onNavigate}
          className={cn(
            ROW,
            indent && "pl-6",
            current
              ? "bg-accent/10 text-accent"
              : "text-foreground hover:bg-surface",
          )}
        >
          {item.label}
          {item.href.endsWith("/notifications") ? (
            <UnreadBadge unread={unread} />
          ) : null}
        </Link>
      </li>
    );
  };

  return (
    <div className={cn("flex flex-col", headings ? "gap-0.5" : "gap-4")}>
      {sections.map((section, index) => {
        const key = section.group ?? `top-${index}`;
        if (!headings || !section.group) {
          return (
            <ul key={key} className="flex flex-col gap-0.5">
              {section.items.map((item) => renderLink(item, false))}
            </ul>
          );
        }
        const listId = `${headingId}-${index}`;
        const expanded = open === section.group;
        const holdsCurrent = activeGroup === section.group;
        const holdsUnread = section.group === notificationsGroup && unread > 0;
        return (
          <div key={key}>
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={listId}
              aria-label={
                !expanded && (holdsCurrent || holdsUnread)
                  ? `${holdsUnread ? unreadLabel(section.group, unread) : section.group}${holdsCurrent ? ", contains current page" : ""}`
                  : undefined
              }
              onClick={() => setOpen(expanded ? null : section.group!)}
              className={cn(
                ROW,
                "w-full justify-between text-left text-foreground hover:bg-surface",
              )}
            >
              <span className="flex items-center">
                {!expanded && holdsCurrent ? (
                  <span
                    aria-hidden="true"
                    data-testid="nav-current-dot"
                    className="mr-2 size-1.5 rounded-pill bg-accent"
                  />
                ) : null}
                {section.group}
                {!expanded && holdsUnread ? (
                  <UnreadBadge unread={unread} />
                ) : null}
              </span>
              {expanded ? (
                <Minus aria-hidden="true" className="size-4 text-muted" />
              ) : (
                <Plus aria-hidden="true" className="size-4 text-muted" />
              )}
            </button>
            <ul
              id={listId}
              hidden={!expanded}
              className="flex flex-col gap-0.5"
            >
              {section.items.map((item) => renderLink(item, true))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
