/**
 * The unread count beside "Notifications", as a visible number ("99+" past
 * 99). It is hidden from screen readers: the entry's `aria-label` carries the
 * count (`unreadLabel`). Nothing while there is none.
 */
export function UnreadBadge({ unread }: { unread: number }) {
  if (unread === 0) return null;
  return (
    <span
      aria-hidden="true"
      className="ml-2 inline-flex min-w-5 items-center justify-center rounded-pill bg-accent-fill px-1.5 text-caption font-semibold text-accent-foreground"
    >
      {unread > 99 ? "99+" : unread}
    </span>
  );
}
