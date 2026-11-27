"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Banknote,
  Building2,
  ChevronRight,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  Plane,
  Settings,
  Tag,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
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

/**
 * Icons of the top-level rows, by category name or by href, resolved here so
 * `NavItem` stays plain data across the server/client boundary.
 */
const ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/operator": LayoutDashboard,
  "/admin/reports": BarChart3,
  Operations: ClipboardList,
  "Operators and fleet": Plane,
  Pricing: Tag,
  Finance: Wallet,
  Platform: Settings,
  "Requests and bookings": Inbox,
  Fleet: Plane,
  Account: Building2,
  Business: Banknote,
};

const ICON = { size: 18, strokeWidth: 1.5, "aria-hidden": true } as const;

const ROW =
  "relative flex items-center rounded-sm px-3 font-medium transition duration-150 ease-standard active:scale-97 motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";
const TOP = "min-h-11 gap-2.5 px-2.5 py-1 md:min-h-10";
const SUB = "min-h-11 py-1 md:min-h-9";

/** Open categories are a display preference of the browser session, per portal. */
const storageKey = (items: NavItem[]) =>
  `flyviman:nav-open:${items[0]?.href.split("/")[1] ?? "portal"}`;

function readStored(key: string, known: string[]): string[] {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(key) ?? "[]");
    return Array.isArray(value)
      ? value.filter(
          (v): v is string => typeof v === "string" && known.includes(v),
        )
      : [];
  } catch {
    return [];
  }
}

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
  const groups = sections.flatMap((s) => (s.group ? [s.group] : []));
  // Categories open and close on their own. The current page's category is
  // open on the first render (server and client agree) and is added again
  // after every navigation; navigation never closes one.
  const [seen, setSeen] = useState(pathname);
  const [open, setOpen] = useState<string[]>(activeGroup ? [activeGroup] : []);
  if (seen !== pathname) {
    setSeen(pathname);
    if (activeGroup && !open.includes(activeGroup)) {
      setOpen([...open, activeGroup]);
    }
  }
  // Stored categories are applied after mount, then motion is switched on.
  const key = storageKey(items);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const stored = readStored(key, groups);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage exists only in the browser
    if (stored.length) setOpen((now) => [...new Set([...now, ...stored])]);
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setReady(true)),
    );
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once on mount
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(open));
    } catch {
      /* a display preference: losing it is harmless */
    }
  }, [open, ready, key]);
  const notificationsGroup =
    items.find((item) => item.href.endsWith("/notifications"))?.group ?? null;

  const renderLink = (item: NavItem, sub: boolean) => {
    const current = item.href === active;
    const Icon = sub ? undefined : ICONS[item.href];
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
            sub ? SUB : TOP,
            current
              ? "bg-accent/10 text-accent"
              : "text-foreground hover:bg-surface",
          )}
        >
          {sub && current ? (
            <span
              aria-hidden="true"
              className="absolute -left-2 inset-y-2 w-0.5 rounded-pill bg-accent"
            />
          ) : null}
          {Icon ? <Icon {...ICON} className="shrink-0" /> : null}
          {item.label}
          {item.href.endsWith("/notifications") ? (
            <UnreadBadge unread={unread} />
          ) : null}
        </Link>
      </li>
    );
  };

  return (
    <div
      data-nav-ready={ready}
      className={cn("flex flex-col", headings ? "gap-1" : "gap-4")}
    >
      {sections.map((section, index) => {
        const sectionKey = section.group ?? `top-${index}`;
        if (!headings || !section.group) {
          return (
            <ul
              key={sectionKey}
              className={cn(
                "flex flex-col gap-1",
                headings && index === 0 && "mb-2",
              )}
            >
              {section.items.map((item) => renderLink(item, false))}
            </ul>
          );
        }
        const listId = `${headingId}-${index}`;
        const expanded = open.includes(section.group);
        const holdsCurrent = activeGroup === section.group;
        const holdsUnread = section.group === notificationsGroup && unread > 0;
        const Icon = ICONS[section.group];
        return (
          <div key={sectionKey}>
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={listId}
              aria-label={
                !expanded && (holdsCurrent || holdsUnread)
                  ? `${holdsUnread ? unreadLabel(section.group, unread) : section.group}${holdsCurrent ? ", contains current page" : ""}`
                  : undefined
              }
              onClick={() =>
                setOpen(
                  expanded
                    ? open.filter((g) => g !== section.group)
                    : [...open, section.group!],
                )
              }
              className={cn(
                ROW,
                TOP,
                "w-full justify-between text-left text-foreground hover:bg-surface",
              )}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                {Icon ? <Icon {...ICON} className="shrink-0" /> : null}
                <span className="leading-tight">{section.group}</span>
                {!expanded && holdsCurrent ? (
                  <span
                    aria-hidden="true"
                    data-testid="nav-current-dot"
                    className="absolute left-1 top-1/2 size-1.5 -translate-y-1/2 rounded-pill bg-accent"
                  />
                ) : null}
                {!expanded && holdsUnread ? (
                  <UnreadBadge unread={unread} />
                ) : null}
              </span>
              <ChevronRight
                {...ICON}
                data-open={expanded}
                className="nav-chevron ml-1 size-4 shrink-0 text-muted"
              />
            </button>
            <div
              className="nav-panel ml-5 border-l border-border"
              data-open={expanded}
              style={{ visibility: expanded ? "visible" : "hidden" }}
            >
              <div className="nav-panel__inner pl-2" inert={!expanded}>
                <ul id={listId} className="flex flex-col gap-0.5 py-1">
                  {section.items.map((item) => renderLink(item, true))}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
